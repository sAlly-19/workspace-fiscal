import type { AppSettings } from '@/core/buscador/domain/types';
import type { PageSize } from '@/core/buscador/domain/page-size';

export async function changePageSize(
  size: PageSize,
  save: (value: Partial<AppSettings>) => Promise<AppSettings>,
  reloadFirstPage: (size: PageSize) => Promise<void>,
): Promise<AppSettings> {
  const updated = await save({ items_per_page: size });
  await reloadFirstPage(size);
  return updated;
}
