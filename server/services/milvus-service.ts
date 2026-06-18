import { config } from "dotenv";
config();

const MILVUS_API_BASE_URL = process.env.MILVUS_API_BASE_URL || "https://apiintegracao.milvus.com.br/api";
const MILVUS_API_TOKEN = process.env.MILVUS_API_TOKEN || "";

export interface MilvusClient {
  id: number;
  razao_social: string;
  nome_fantasia?: string;
  cnpj_cpf?: string;
  inscricao_estadual?: string;
  site?: string;
  sexo?: string | null;
  is_fisica?: boolean;
  is_ativo?: boolean;
  data_nascimento?: string | null;
  observacao?: string;
  is_sla?: boolean;
  is_esporadico?: boolean;
  token?: string;
  timezone?: string;
  idioma?: number;
  bc_cliente_id?: number | null;
  tipo_tempo_sla_id?: number;
  pais_id?: number | null;
  cliente_matriz_id?: number | null;
  motivo_bloqueio?: string | null;
  tipo_moeda?: string | null;
  is_visivel?: boolean;
  equipes?: string[];
  grupo_categorias?: string[];
}

export interface MilvusSearchResponse {
  lista?: MilvusClient[];
  message?: string;
}

export class MilvusService {
  private baseUrl: string;
  private token: string;

  constructor() {
    this.baseUrl = MILVUS_API_BASE_URL.replace(/\/$/, "");
    this.token = MILVUS_API_TOKEN;
  }

  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    if (!this.token || this.token === "token_configurado_no_servidor") {
      throw new Error("Token da API Milvus não configurado. Verifique a variável MILVUS_API_TOKEN no arquivo .env.");
    }

    const url = `${this.baseUrl}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: this.token,
        "Content-Type": "application/json",
        ...(options?.headers || {}),
      },
    });

    if (!response.ok) {
      const text = await response.text();
      if (response.status === 401) {
        throw new Error("Token da API Milvus é inválido ou não tem permissão para esta operação. Verifique o token configurado no .env.");
      }
      throw new Error(`Erro na API Milvus (${response.status}): ${text}`);
    }

    return response.json() as Promise<T>;
  }

  async searchClients(params?: { documento?: string; nome_fantasia?: string; status?: string }): Promise<MilvusClient[]> {
    const searchParams = new URLSearchParams();
    if (params?.documento) searchParams.append("documento", params.documento);
    if (params?.nome_fantasia) searchParams.append("nome_fantasia", params.nome_fantasia);
    if (params?.status) searchParams.append("status", params.status);

    const queryString = searchParams.toString() ? `?${searchParams.toString()}` : "";
    const response = await this.request<MilvusSearchResponse>(`/cliente/busca${queryString}`);

    if (response.message && !response.lista) {
      throw new Error(response.message);
    }

    return response.lista || [];
  }

  async getClientById(milvusId: string): Promise<MilvusClient | null> {
    try {
      const response = await this.request<MilvusSearchResponse>(`/cliente/busca?documento=${encodeURIComponent(milvusId)}`);
      if (response.lista && response.lista.length > 0) {
        return response.lista[0];
      }
      return null;
    } catch {
      return null;
    }
  }

  async getAllClients(): Promise<MilvusClient[]> {
    const response = await this.request<MilvusSearchResponse>("/cliente/busca?status=3");
    return response.lista || [];
  }

  normalizeClient(milvusClient: MilvusClient) {
    return {
      name: milvusClient.razao_social || milvusClient.nome_fantasia || "",
      email: milvusClient.site || "",
      phone: "",
      address: "",
      milvusId: String(milvusClient.id),
      document: milvusClient.cnpj_cpf || "",
      source: "milvus" as const,
      status: milvusClient.is_ativo === false ? "inactive" : "active",
      lastSyncAt: new Date(),
      syncStatus: "synced" as const,
      milvusUpdatedAt: new Date(),
    };
  }
}

export const milvusService = new MilvusService();
