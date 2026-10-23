-- Un pedido con movimientos de inventario no se puede borrar: el libro es la evidencia. Antes la clave foránea
-- intentaba soltar el vínculo (UPDATE) y el libro, que solo se agrega, lo rechazaba con un error confuso.
alter table public.inventory_movements drop constraint inventory_movements_order_id_fkey;
alter table public.inventory_movements
  add constraint inventory_movements_order_id_fkey foreign key (order_id) references public.orders(id) on delete restrict;
