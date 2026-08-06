-- ============================================================
-- SCHEMA DO BANCO DE DADOS - CONTROLE DE MATERIAIS (SUPABASE)
-- ============================================================
-- Execute este script no SQL Editor do Supabase

-- Habilitar extensão UUID (opcional, mas recomendado)
extension if not exists "uuid-ossp";

-- ============================================================
-- TABELA: sub_local (Sub-locais de Armazenamento)
-- ============================================================
create table if not exists public.sub_local (
    id serial primary key,
    descricao text not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

comment on table public.sub_local is 'Sub-locais de armazenamento de materiais';
comment on column public.sub_local.descricao is 'Descrição do sub-local de armazenamento';

-- ============================================================
-- TABELA: local_armazenamento (Locais de Armazenamento)
-- ============================================================
create table if not exists public.local_armazenamento (
    id serial primary key,
    descricao text not null,
    id_sub_local integer references public.sub_local(id) on delete set null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

comment on table public.local_armazenamento is 'Locais de armazenamento de materiais';
comment on column public.local_armazenamento.descricao is 'Descrição do local de armazenamento';
comment on column public.local_armazenamento.id_sub_local is 'Referência ao sub-local de armazenamento';

-- ============================================================
-- TABELA: perfis (Perfis de Usuário com nível de acesso)
-- ============================================================
create table if not exists public.perfis (
    id uuid references auth.users on delete cascade primary key,
    nome text not null,
    email text not null,
    nivel_acesso text not null check (nivel_acesso in ('admin', 'gerente', 'operador', 'consulta')) default 'consulta',
    funcionalidades text[] default array['visualizar'],
    ativo boolean default true,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

comment on table public.perfis is 'Perfis de usuários do sistema';
comment on column public.perfis.nivel_acesso is 'Nível de acesso: admin, gerente, operador, consulta';
comment on column public.perfis.funcionalidades is 'Array de funcionalidades permitidas: cadastrar, editar, excluir, visualizar, exportar, receber, retirar';

-- ============================================================
-- TABELA: material (Cadastro de Materiais)
-- ============================================================
create table if not exists public.material (
    id serial primary key,
    id_local integer references public.local_armazenamento(id) on delete set null,
    om numeric(12,0) not null,
    descricao text not null,
    pedido_reserva text,
    codigo_sap text,
    quantidade numeric(15,2) default 0,
    data_entrada date,
    data_saida date,
    local_aplicacao text,
    recebedor text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

comment on table public.material is 'Cadastro de materiais no estoque';
comment on column public.material.om is 'OM - Ordem de Manutenção (12 dígitos)';
comment on column public.material.pedido_reserva is 'Número do pedido ou reserva';
comment on column public.material.codigo_sap is 'Código SAP do material';
comment on column public.material.quantidade is 'Quantidade atual do material';

-- ============================================================
-- TABELA: controle_materiais (Controle de Estoque)
-- ============================================================
create table if not exists public.controle_materiais (
    id serial primary key,
    id_local integer references public.local_armazenamento(id) on delete set null,
    id_material integer references public.material(id) on delete cascade,
    estoque_minimo numeric(15,2) default 0,
    estoque_maximo numeric(15,2) default 0,
    limite_solicitacao numeric(15,2) default 0,
    entrada numeric(15,2) default 0,
    saida numeric(15,2) default 0,
    estoque_atual numeric(15,2) generated always as (entrada - saida) stored,
    data_entrada date,
    data_saida date,
    status text generated always as (
        case 
            when (entrada - saida) < estoque_minimo then 'Abaixo do mínimo'
            when (entrada - saida) > estoque_maximo then 'Acima do máximo'
            else 'Dentro do Intervalo'
        end
    ) stored,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

comment on table public.controle_materiais is 'Controle de estoque e movimentação de materiais';
comment on column public.controle_materiais.estoque_minimo is 'Quantidade mínima permitida em estoque';
comment on column public.controle_materiais.estoque_maximo is 'Quantidade máxima permitida em estoque';
comment on column public.controle_materiais.limite_solicitacao is 'Limite para alerta de necessidade de compra';
comment on column public.controle_materiais.entrada is 'Total acumulado de entradas';
comment on column public.controle_materiais.saida is 'Total acumulado de saídas';
comment on column public.controle_materiais.estoque_atual is 'Estoque atual calculado (entrada - saída)';
comment on column public.controle_materiais.status is 'Status automático baseado nos limites';

-- ============================================================
-- TABELA: movimentacao (Histórico de Movimentações)
-- ============================================================
create table if not exists public.movimentacao (
    id serial primary key,
    id_material integer references public.material(id) on delete cascade,
    tipo text not null check (tipo in ('entrada', 'saida')),
    quantidade numeric(15,2) not null,
    data_movimentacao date not null default current_date,
    responsavel text,
    observacao text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

comment on table public.movimentacao is 'Histórico de movimentações de entrada e saída';

-- ============================================================
-- ÍNDICES PARA PERFORMANCE
-- ============================================================
create index if not exists idx_material_om on public.material(om);
create index if not exists idx_material_descricao on public.material(descricao);
create index if not exists idx_material_data_entrada on public.material(data_entrada);
create index if not exists idx_material_data_saida on public.material(data_saida);
create index if not exists idx_material_id_local on public.material(id_local);
create index if not exists idx_controle_id_material on public.controle_materiais(id_material);
create index if not exists idx_controle_status on public.controle_materiais(status);
create index if not exists idx_movimentacao_id_material on public.movimentacao(id_material);
create index if not exists idx_movimentacao_tipo on public.movimentacao(tipo);

-- ============================================================
-- POLÍTICAS DE SEGURANÇA (RLS - Row Level Security)
-- ============================================================

-- Habilitar RLS em todas as tabelas
alter table public.sub_local enable row level security;
alter table public.local_armazenamento enable row level security;
alter table public.perfis enable row level security;
alter table public.material enable row level security;
alter table public.controle_materiais enable row level security;
alter table public.movimentacao enable row level security;

-- Políticas para sub_local
create policy "Permitir leitura para usuários autenticados" on public.sub_local
    for select to authenticated using (true);
create policy "Permitir inserção para admin e gerente" on public.sub_local
    for insert to authenticated with check (
        exists (select 1 from public.perfis where id = auth.uid() and nivel_acesso in ('admin', 'gerente'))
    );
create policy "Permitir atualização para admin e gerente" on public.sub_local
    for update to authenticated using (
        exists (select 1 from public.perfis where id = auth.uid() and nivel_acesso in ('admin', 'gerente'))
    );
create policy "Permitir exclusão apenas para admin" on public.sub_local
    for delete to authenticated using (
        exists (select 1 from public.perfis where id = auth.uid() and nivel_acesso = 'admin')
    );

-- Políticas para local_armazenamento
create policy "Permitir leitura para usuários autenticados" on public.local_armazenamento
    for select to authenticated using (true);
create policy "Permitir inserção para admin e gerente" on public.local_armazenamento
    for insert to authenticated with check (
        exists (select 1 from public.perfis where id = auth.uid() and nivel_acesso in ('admin', 'gerente'))
    );
create policy "Permitir atualização para admin e gerente" on public.local_armazenamento
    for update to authenticated using (
        exists (select 1 from public.perfis where id = auth.uid() and nivel_acesso in ('admin', 'gerente'))
    );
create policy "Permitir exclusão apenas para admin" on public.local_armazenamento
    for delete to authenticated using (
        exists (select 1 from public.perfis where id = auth.uid() and nivel_acesso = 'admin')
    );

-- Políticas para material
create policy "Permitir leitura para usuários autenticados" on public.material
    for select to authenticated using (true);
create policy "Permitir inserção para admin, gerente e operador" on public.material
    for insert to authenticated with check (
        exists (select 1 from public.perfis where id = auth.uid() and nivel_acesso in ('admin', 'gerente', 'operador'))
    );
create policy "Permitir atualização para admin, gerente e operador" on public.material
    for update to authenticated using (
        exists (select 1 from public.perfis where id = auth.uid() and nivel_acesso in ('admin', 'gerente', 'operador'))
    );
create policy "Permitir exclusão apenas para admin" on public.material
    for delete to authenticated using (
        exists (select 1 from public.perfis where id = auth.uid() and nivel_acesso = 'admin')
    );

-- Políticas para controle_materiais
create policy "Permitir leitura para usuários autenticados" on public.controle_materiais
    for select to authenticated using (true);
create policy "Permitir inserção para admin, gerente e operador" on public.controle_materiais
    for insert to authenticated with check (
        exists (select 1 from public.perfis where id = auth.uid() and nivel_acesso in ('admin', 'gerente', 'operador'))
    );
create policy "Permitir atualização para admin, gerente e operador" on public.controle_materiais
    for update to authenticated using (
        exists (select 1 from public.perfis where id = auth.uid() and nivel_acesso in ('admin', 'gerente', 'operador'))
    );

-- Políticas para movimentacao
create policy "Permitir leitura para usuários autenticados" on public.movimentacao
    for select to authenticated using (true);
create policy "Permitir inserção para admin, gerente e operador" on public.movimentacao
    for insert to authenticated with check (
        exists (select 1 from public.perfis where id = auth.uid() and nivel_acesso in ('admin', 'gerente', 'operador'))
    );

-- Políticas para perfis
create policy "Usuários podem ver seus próprios perfis" on public.perfis
    for select to authenticated using (auth.uid() = id);
create policy "Admin pode ver todos os perfis" on public.perfis
    for select to authenticated using (
        exists (select 1 from public.perfis where id = auth.uid() and nivel_acesso = 'admin')
    );
create policy "Admin pode inserir perfis" on public.perfis
    for insert to authenticated with check (
        exists (select 1 from public.perfis where id = auth.uid() and nivel_acesso = 'admin')
    );
create policy "Admin pode atualizar perfis" on public.perfis
    for update to authenticated using (
        exists (select 1 from public.perfis where id = auth.uid() and nivel_acesso = 'admin')
    );

-- ============================================================
-- FUNÇÕES E TRIGGERS
-- ============================================================

-- Função para atualizar updated_at automaticamente
create or replace function public.atualizar_updated_at()
returns trigger as $$
begin
    new.updated_at = timezone('utc'::text, now());
    return new;
end;
$$ language plpgsql security definer;

-- Triggers para updated_at
create trigger trg_atualizar_local_armazenamento
    before update on public.local_armazenamento
    for each row execute function public.atualizar_updated_at();

create trigger trg_atualizar_material
    before update on public.material
    for each row execute function public.atualizar_updated_at();

create trigger trg_atualizar_controle_materiais
    before update on public.controle_materiais
    for each row execute function public.atualizar_updated_at();

create trigger trg_atualizar_perfis
    before update on public.perfis
    for each row execute function public.atualizar_updated_at();

-- Função para criar perfil automaticamente após signup
create or replace function public.criar_perfil_usuario()
returns trigger as $$
begin
    insert into public.perfis (id, nome, email, nivel_acesso, funcionalidades)
    values (
        new.id,
        coalesce(new.raw_user_meta_data->>'nome', new.email),
        new.email,
        coalesce(new.raw_user_meta_data->>'nivel_acesso', 'consulta'),
        array['visualizar']
    );
    return new;
end;
$$ language plpgsql security definer;

-- Trigger para criar perfil após signup
create trigger trg_criar_perfil_apos_signup
    after insert on auth.users
    for each row execute function public.criar_perfil_usuario();

-- Função para registrar movimentação e atualizar estoque
create or replace function public.registrar_movimentacao(
    p_id_material integer,
    p_tipo text,
    p_quantidade numeric,
    p_responsavel text default null,
    p_observacao text default null
)
returns void as $$
declare
    v_controle_id integer;
    v_id_local integer;
begin
    -- Obter id_local do material
    select id_local into v_id_local from public.material where id = p_id_material;

    -- Inserir movimentação
    insert into public.movimentacao (id_material, tipo, quantidade, responsavel, observacao)
    values (p_id_material, p_tipo, p_quantidade, p_responsavel, p_observacao);

    -- Atualizar controle de materiais
    select id into v_controle_id from public.controle_materiais where id_material = p_id_material;

    if v_controle_id is not null then
        if p_tipo = 'entrada' then
            update public.controle_materiais
            set entrada = entrada + p_quantidade,
                data_entrada = current_date
            where id = v_controle_id;
        elsif p_tipo = 'saida' then
            update public.controle_materiais
            set saida = saida + p_quantidade,
                data_saida = current_date
            where id = v_controle_id;
        end if;
    else
        -- Criar registro de controle se não existir
        if p_tipo = 'entrada' then
            insert into public.controle_materiais (id_local, id_material, entrada, data_entrada)
            values (v_id_local, p_id_material, p_quantidade, current_date);
        elsif p_tipo = 'saida' then
            insert into public.controle_materiais (id_local, id_material, saida, data_saida)
            values (v_id_local, p_id_material, p_quantidade, current_date);
        end if;
    end if;

    -- Atualizar quantidade na tabela material
    if p_tipo = 'entrada' then
        update public.material
        set quantidade = quantidade + p_quantidade,
            data_entrada = current_date
        where id = p_id_material;
    elsif p_tipo = 'saida' then
        update public.material
        set quantidade = quantidade - p_quantidade,
            data_saida = current_date
        where id = p_id_material;
    end if;
end;
$$ language plpgsql security definer;

-- ============================================================
-- DADOS INICIAIS (Opcional)
-- ============================================================
-- Exemplos de sub-locais
insert into public.sub_local (descricao) values
    ('Almoxarifado Principal'),
    ('Depósito Secundário'),
    ('Área de Recebimento')
on conflict do nothing;

-- Exemplos de locais (descomente após inserir sub-locais)
-- insert into public.local_armazenamento (descricao, id_sub_local) values
--     ('Prateleira A1', 1),
--     ('Prateleira A2', 1),
--     ('Gondola B1', 2),
--     ('Área de Recebimento 01', 3)
-- on conflict do nothing;
