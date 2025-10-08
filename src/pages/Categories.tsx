// src/pages/Categories.tsx

import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useGroup } from '@/contexts/GroupContext';
import { Category } from '@/types';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import CategoryModal from '@/components/CategoryModal';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

export default function CategoriesSettings() {
  const { user, decrypt, encrypt } = useAuth();
  const { selectedGroup } = useGroup();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  const fetchCategories = async () => {
    if (!user) return;
    setLoading(true);
    let query = supabase.from('categories').select('*');
    if (selectedGroup) {
      query = query.eq('group_id', selectedGroup);
    } else {
      query = query.is('group_id', null).eq('user_id', user.id);
    }
    const { data, error } = await query.order('name', { ascending: true });
    
    if (error) {
      toast({ title: 'Erro ao buscar categorias', description: error.message, variant: 'destructive' });
    } else if (data) {
      setCategories(data as Category[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (user) {
      fetchCategories();
    }
  }, [user, selectedGroup]);

  const handleAddNew = () => {
    setEditingCategory(null);
    setIsModalOpen(true);
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setIsModalOpen(true);
  };

  const handleDelete = async (category: Category) => {
    const { data: transactions, error: searchError } = await supabase
      .from('transacoes')
      .select('id')
      .eq('categoria', category.name) // Compara o nome criptografado
      .limit(1);
    
    if (searchError) {
      toast({ title: 'Erro ao verificar uso da categoria', description: searchError.message, variant: 'destructive' });
      return;
    }

    if (transactions && transactions.length > 0) {
      toast({ title: 'Ação não permitida', description: 'Esta categoria está em uso e não pode ser excluída.', variant: 'destructive' });
      return;
    }

    const { error } = await supabase.from('categories').delete().eq('id', category.id);
    if (error) {
      toast({ title: 'Erro ao excluir categoria', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Categoria excluída', description: 'A categoria foi removida com sucesso.' });
      fetchCategories();
    }
  };

  return (
    <Card>
        <CardHeader className="flex flex-row justify-between items-center">
            <div>
                <CardTitle>Gerenciar Categorias</CardTitle>
                <CardDescription>Adicione, edite ou remova suas categorias de transações.</CardDescription>
            </div>
            <Button onClick={handleAddNew}>
                <Plus className="mr-2 h-4 w-4" /> Nova Categoria
            </Button>
        </CardHeader>
        <CardContent>
            <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow><TableCell colSpan={2} className="text-center">Carregando...</TableCell></TableRow>
                    ) : categories.length > 0 ? (
                      categories.map((category) => (
                        <TableRow key={category.id}>
                          <TableCell className="font-medium">{decrypt(category.name)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button variant="ghost" size="sm" onClick={() => handleEdit(category)}><Pencil className="h-4 w-4" /></Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="sm"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Essa ação não pode ser desfeita. Isso excluirá permanentemente a categoria
                                      <span className="font-bold"> "{decrypt(category.name)}"</span>.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDelete(category)}>Excluir</AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow><TableCell colSpan={2} className="text-center h-24">Nenhuma categoria encontrada.</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
            </div>
        </CardContent>
        <CategoryModal
            open={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            category={editingCategory}
            onSuccess={fetchCategories}
        />
    </Card>
  );
}