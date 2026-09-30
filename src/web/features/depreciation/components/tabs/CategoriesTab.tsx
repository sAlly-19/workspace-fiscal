import { Edit2, Trash2 } from 'lucide-react';

export interface CategoriesTabProps {
  isLight: boolean;
  categories: any[];
  onOpenNewCategory: () => void;
  onOpenEditCategory: (cat: any) => void;
  onConfirmDeleteCategory: (cat: any) => void;
}

export function CategoriesTab({
  isLight,
  categories,
  onOpenNewCategory,
  onOpenEditCategory,
  onConfirmDeleteCategory,
}: CategoriesTabProps) {
  return (
    <div className="p-6 max-w-3xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h2 className={`text-sm font-black ${isLight ? 'text-[#0f172a]' : 'text-white'}`}>Categorias</h2>
        <button onClick={onOpenNewCategory} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold cursor-pointer">+ Nova categoria</button>
      </div>
      <div className={`rounded-xl border overflow-hidden ${isLight ? 'bg-white border-[#e2e8f0]' : 'bg-[#111114] border-[#27272a]'}`}>
        <table className="w-full text-xs">
          <thead className={`${isLight ? 'bg-[#f1f5f9]' : 'bg-[#18181b]'}`}>
            <tr>
              <th className="text-left px-3 py-2">Nome</th>
              <th className="text-center px-3 py-2">Taxa padrão</th>
              <th className="text-right px-3 py-2">Ações</th>
            </tr>
          </thead>
          <tbody className={`divide-y ${isLight ? 'divide-[#e2e8f0]' : 'divide-[#27272a]'}`}>
            {categories.map((cat) => (
              <tr key={cat.id}>
                <td className="px-3 py-2 font-medium">{cat.name}</td>
                <td className="px-3 py-2 text-center font-bold">{cat.defaultRate}%</td>
                <td className="px-3 py-2 text-right flex justify-end gap-1">
                  <button onClick={() => onOpenEditCategory(cat)} className={`p-1.5 rounded border cursor-pointer ${isLight ? 'bg-white border-[#e2e8f0] hover:bg-[#f1f5f9]' : 'bg-[#18181b] border-[#3f3f46] hover:bg-[#27272a]'}`} title="Editar categoria"><Edit2 className="w-3 h-3" /></button>
                  <button onClick={() => onConfirmDeleteCategory(cat)} className="p-1.5 rounded text-red-500 hover:bg-red-500/10 cursor-pointer" title="Excluir categoria"><Trash2 className="w-3 h-3" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
