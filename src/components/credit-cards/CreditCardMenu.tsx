import { useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { CreditCard } from '@/types/database.types';
import { MoreVertical, Edit, RefreshCw, Archive, Trash2 } from 'lucide-react';
import { ReassignCategoriesDialog } from './ReassignCategoriesDialog';

interface CreditCardMenuProps {
  card: CreditCard;
  onEdit: () => void;
  onArchive: () => void;
  onDelete: () => void;
  onViewInvoices: () => void;
}

export function CreditCardMenu({
  card,
  onEdit,
  onArchive,
  onDelete,
  onViewInvoices,
}: CreditCardMenuProps) {
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [reassignDialogOpen, setReassignDialogOpen] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-xl border border-white/10 bg-black/10 text-white/82 shadow-sm backdrop-blur-sm hover:bg-white/16 hover:text-white"
          >
            <MoreVertical size={16} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(); }}>
            <Edit size={16} className="mr-2" />
            Editar cartão
          </DropdownMenuItem>
          
          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setReassignDialogOpen(true); }}>
            <RefreshCw size={16} className="mr-2" />
            Reassociar categorias
          </DropdownMenuItem>
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem 
            onClick={(e) => { 
              e.stopPropagation(); 
              setArchiveDialogOpen(true); 
            }}
            className="text-warning focus:text-warning data-[highlighted]:text-warning"
          >
            <Archive size={16} className="mr-2" />
            Arquivar cartão
          </DropdownMenuItem>
          
          <DropdownMenuItem 
            onClick={(e) => { 
              e.stopPropagation(); 
              setDeleteDialogOpen(true); 
            }}
            className="text-danger focus:text-danger data-[highlighted]:text-danger"
          >
            <Trash2 size={16} className="mr-2" />
            Excluir cartão
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Dialog de Confirmação - Arquivar */}
      <AlertDialog open={archiveDialogOpen} onOpenChange={setArchiveDialogOpen}>
        <AlertDialogContent onClick={(e) => e.stopPropagation()}>
          <AlertDialogHeader>
            <AlertDialogTitle>Arquivar Cartão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja arquivar o cartão <strong>{card.name}</strong>?
              <br /><br />
              O cartão será ocultado da lista principal, mas todos os dados e histórico serão mantidos.
              Você pode reativá-lo a qualquer momento.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.stopPropagation();
                onArchive();
                setArchiveDialogOpen(false);
              }}
              className="border-warning/25 bg-warning text-white hover:bg-warning/90"
            >
              Arquivar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog de Confirmação - Excluir */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent onClick={(e) => e.stopPropagation()}>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Cartão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o cartão <strong>{card.name}</strong>?
              <br /><br />
              Esta ação não pode ser desfeita. O cartão será marcado como excluído, mas os dados
              históricos serão preservados para fins de relatório.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
                setDeleteDialogOpen(false);
              }}
              className="border-danger/25 bg-danger text-white hover:bg-danger/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog de Reassociar Categorias */}
      <ReassignCategoriesDialog
        open={reassignDialogOpen}
        onOpenChange={setReassignDialogOpen}
        cardId={card.id}
        cardName={card.name}
      />
    </>
  );
}
