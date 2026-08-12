// Phase D stub — Repository removed; data access moves to Cert API (Phase E)
export class BaseRepository {
  constructor(protected table: string, protected client?: any) {}
  async findAll() { return []; }
  async findById(id: string) { return null; }
  async create(data: any) { return data; }
  async update(id: string, data: any) { return data; }
  async delete(id: string) { return true; }
}
