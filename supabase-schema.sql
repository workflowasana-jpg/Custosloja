-- ════════════════════════════════════════════════
--  DTEL — Esquema do banco (Supabase / PostgreSQL)
--  Equivalente às abas da planilha Google Sheets original
-- ════════════════════════════════════════════════
-- Execute este script no Supabase: Painel → SQL Editor → New query → cole e rode.

-- Tabela: usuarios (equivalente à aba "Usuarios")
create table if not exists usuarios (
  id          bigserial primary key,
  nome        text unique not null,
  email       text,
  senha_hash  text not null,
  grupo_id    text,
  ativo       boolean default true,
  senha_temp  boolean default false,
  token       text,
  token_exp   timestamptz,
  criado_em   timestamptz default now()
);

-- Tabela: grupos (equivalente à aba "Grupos")
create table if not exists grupos (
  id          text primary key,        -- ex: 'adm'
  nome        text not null,
  cor         text default '#006633',
  permissoes  text default ''          -- separado por vírgula, igual ao original
);

-- Tabela: produtos (equivalente à aba "Produtos")
create table if not exists produtos (
  id          bigserial primary key,
  nome        text not null,
  categoria   text,
  saldo       integer default 0
);

-- Tabela: categorias (equivalente à aba "Categorias")
create table if not exists categorias (
  id     bigserial primary key,
  nome   text unique not null
);

-- Tabela: setores (equivalente à aba "Setores")
create table if not exists setores (
  id     bigserial primary key,
  nome   text unique not null
);

-- Tabela: registros (equivalente à aba "Registros" — histórico definitivo)
create table if not exists registros (
  id             bigserial primary key,
  pedido         text,
  data           date,
  nf             text,
  item           text,
  categoria      text,
  qtd_soli       integer default 0,
  qtd_dispo      integer default 0,
  preco          numeric default 0,
  setor          text,
  solicitante    text,
  responsavel    text,
  tipo           text,               -- 'Entrada' | 'Saída'
  justificativa  text,
  criado_em      timestamptz default now()
);

-- Tabela: pendentes (equivalente à aba "Pendentes" — solicitações em aberto)
create table if not exists pendentes (
  id           bigserial primary key,
  pedido_id    text,
  data         date,
  item         text,
  categoria    text,
  qtd_soli     integer default 0,
  qtd_dispo    integer default 0,
  setor        text,
  solicitante  text,
  responsavel  text,
  disponivel   boolean default false
);

-- Tabela: sequencial (equivalente à aba "Sequencial" — numeração de pedidos)
create table if not exists sequencial (
  chave  text primary key,
  valor  integer not null
);

insert into sequencial (chave, valor)
  values ('PedidoSeq', 1001)
  on conflict (chave) do nothing;

-- Grupo administrador padrão
insert into grupos (id, nome, cor, permissoes)
  values ('adm', 'Administrador', '#005229',
          'solicitacao,base,entrada,saida,custo,configuracao,permissao')
  on conflict (id) do nothing;

-- Usuário Admin padrão — senha inicial "admin123"
-- (hash SHA-256 de "admin123": veja lib/hash.js — troque a senha no primeiro acesso!)
insert into usuarios (nome, email, senha_hash, grupo_id, ativo)
  values (
    'Admin',
    'admin@dtel.com.br',
    '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9', -- sha256("admin123")
    'adm',
    true
  )
  on conflict (nome) do nothing;
