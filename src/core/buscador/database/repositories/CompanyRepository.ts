import { DatabaseManager } from '../connection';
import { Company, CreateCompanyDTO, UpdateCompanyDTO } from '../../domain/types';
import { sanitizeCNPJ } from '../../domain/cnpj';
import { getUfCode, getUfAcronym } from '../../domain/uf';

export class CompanyRepository {
  constructor(private db: DatabaseManager) {}

  private mapRow(r: any): Company {
    const numId = Number(r.numeric_id !== undefined && r.numeric_id !== null ? r.numeric_id : r.id);
    return {
      ...r,
      id: !isNaN(numId) && numId > 0 ? numId : Number(r.rowid || 1),
      uf: r.uf ? getUfAcronym(r.uf) : 'SP',
      is_active: Boolean(r.is_active),
    };
  }

  public listAll(): Company[] {
    const rows = this.db.queryAll<any>('SELECT rowid, * FROM companies ORDER BY name ASC;');
    return rows.map((r) => this.mapRow(r));
  }

  public findById(id: number): Company | null {
    const row = this.db.queryOne<any>(
      'SELECT rowid, * FROM companies WHERE numeric_id = ? OR id = ? OR id = CAST(? AS TEXT);',
      [id, id, id]
    );
    if (!row) return null;
    return this.mapRow(row);
  }

  public findByCNPJ(cnpj: string): Company | null {
    const cleanCNPJ = sanitizeCNPJ(cnpj);
    const row = this.db.queryOne<any>('SELECT rowid, * FROM companies WHERE cnpj = ?;', [cleanCNPJ]);
    if (!row) return null;
    return this.mapRow(row);
  }

  public create(dto: CreateCompanyDTO): Company {
    const cleanCNPJ = sanitizeCNPJ(dto.cnpj);

    // Valida duplicidade / deduplica
    const existing = this.findByCNPJ(cleanCNPJ);
    if (existing) {
      return existing;
    }

    // Se for a primeira empresa, torna ativa por padrão
    const total = this.db.queryOne<{ count: number }>('SELECT COUNT(*) as count FROM companies;');
    const isFirst = (total?.count || 0) === 0;
    const ufCode = getUfCode(dto.uf);
    const maxRes = this.db.queryOne<{ maxId: number }>('SELECT COALESCE(MAX(numeric_id), 0) as maxId FROM companies;');
    const nextNumericId = Number(maxRes?.maxId || 0) + 1;
    const uuid = `comp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    this.db.execute(
      `INSERT INTO companies (id, numeric_id, name, cnpj, uf, state, folder_path, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
      [uuid, nextNumericId, dto.name.trim(), cleanCNPJ, ufCode, dto.uf || 'SP', dto.folder_path || null, isFirst ? 1 : 0]
    );

    const created = this.findById(nextNumericId);
    if (!created) {
      throw new Error('Falha ao recuperar empresa criada.');
    }
    return created;
  }

  public update(dto: UpdateCompanyDTO): Company {
    const existing = this.findById(dto.id);
    if (!existing) {
      throw new Error(`Empresa com id ${dto.id} não encontrada.`);
    }

    let cleanCNPJ = existing.cnpj;
    if (dto.cnpj) {
      cleanCNPJ = sanitizeCNPJ(dto.cnpj);
      const duplicate = this.findByCNPJ(cleanCNPJ);
      if (duplicate && duplicate.id !== dto.id) {
        throw new Error(`Outra empresa já utiliza o CNPJ ${cleanCNPJ}.`);
      }
    }

    const ufCode = dto.uf !== undefined ? getUfCode(dto.uf) : (existing.uf ? getUfCode(existing.uf) : '35');

    this.db.execute(
      `UPDATE companies 
       SET name = ?, cnpj = ?, uf = ?, state = ?, folder_path = ?, updated_at = datetime('now', 'localtime')
       WHERE numeric_id = ? OR id = ? OR id = CAST(? AS TEXT);`,
      [
        dto.name ? dto.name.trim() : existing.name,
        cleanCNPJ,
        ufCode,
        dto.uf || existing.uf || 'SP',
        dto.folder_path !== undefined ? dto.folder_path : existing.folder_path,
        dto.id,
        dto.id,
        dto.id,
      ]
    );

    return this.findById(dto.id)!;
  }

  public delete(id: number): boolean {
    const result = this.db.execute(
      'DELETE FROM companies WHERE numeric_id = ? OR id = ? OR id = CAST(? AS TEXT);',
      [id, id, id]
    );
    return result.changes > 0;
  }

  public getActive(): Company | null {
    const row = this.db.queryOne<any>('SELECT rowid, * FROM companies WHERE is_active = 1 LIMIT 1;');
    if (!row) {
      // Fallback para a primeira cadastrada se nenhuma estiver marcada
      const first = this.db.queryOne<any>('SELECT rowid, * FROM companies ORDER BY id ASC LIMIT 1;');
      if (!first) return null;
      const mappedFirst = this.mapRow(first);
      this.setActive(mappedFirst.id);
      return { ...mappedFirst, is_active: true };
    }
    return this.mapRow(row);
  }

  public setActive(id: number): boolean {
    if (!this.findById(id)) return false;
    return this.db.transaction(() => {
      this.db.execute('UPDATE companies SET is_active = 0;');
      const result = this.db.execute(
        'UPDATE companies SET is_active = 1 WHERE numeric_id = ? OR id = ? OR id = CAST(? AS TEXT);',
        [id, id, id]
      );
      return result.changes > 0;
    });
  }
}
