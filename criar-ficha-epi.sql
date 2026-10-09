-- ═══════════════════════════════════════════════════════════════════════
--  ÍNTEGRA — Segurança: Ficha de EPI
--  Cria as tabelas e carrega o conteúdo vindo de
--  "RQ-065-V1 - FO-RH-05-V0 - REVISÃO 2 MODELO NOVO.xls"
--
--  COMO USAR: Supabase > SQL Editor > cole tudo > Run.
--  Pode rodar mais de uma vez: não duplica nada.
--
--  O QUE CRIA
--    epi_catalogo     — os 54 EPIs distintos (descrição + CA)
--    epi_grupos       — os 9 grupos de função
--    epi_kit          — o que cada grupo recebe (97 linhas)
--    epi_funcao_grupo — qual função do Efetivo cai em qual grupo (61 funções)
-- ═══════════════════════════════════════════════════════════════════════

create table if not exists epi_catalogo (
  id          text primary key,
  empresa_id  text not null,
  descricao   text not null,
  ca          text default '',
  status      text default 'ativo',
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);
create unique index if not exists epi_catalogo_uk
  on epi_catalogo (empresa_id, upper(btrim(descricao)), upper(btrim(coalesce(ca,''))));

create table if not exists epi_grupos (
  id          text primary key,
  empresa_id  text not null,
  nome        text not null,
  ordem       integer default 0,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);
create unique index if not exists epi_grupos_uk on epi_grupos (empresa_id, upper(btrim(nome)));

create table if not exists epi_kit (
  id          text primary key,
  empresa_id  text not null,
  grupo_id    text not null,
  qtde        integer default 1,
  ca          text default '',
  descricao   text not null,
  ordem       integer default 0,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);
create index if not exists epi_kit_grupo on epi_kit (grupo_id, ordem);

create table if not exists epi_funcao_grupo (
  id          text primary key,
  empresa_id  text not null,
  funcao      text not null,
  grupo_id    text not null,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);
create unique index if not exists epi_funcao_grupo_uk
  on epi_funcao_grupo (empresa_id, upper(btrim(funcao)));

-- ── Conteúdo ─────────────────────────────────────────────────────────

insert into epi_grupos (id, empresa_id, nome, ordem) values
  ('epig-ajudante', 'emp-928389', 'Ajudante', 0),
  ('epig-eletricista', 'emp-928389', 'Eletricista', 1),
  ('epig-mecanico-montador', 'emp-928389', 'Mecânico montador', 2),
  ('epig-supervisor', 'emp-928389', 'Supervisor', 3),
  ('epig-tec-seg-trabalho', 'emp-928389', 'Téc. Seg. Trabalho', 4),
  ('epig-administracao', 'emp-928389', 'Administração', 5),
  ('epig-motorista', 'emp-928389', 'Motorista', 6),
  ('epig-soldador', 'emp-928389', 'Soldador', 7),
  ('epig-compras', 'emp-928389', 'Compras', 8)
on conflict (id) do nothing;

insert into epi_catalogo (id, empresa_id, descricao, ca) values
  ('epic-000', 'emp-928389', 'Capacete de segurança c/ jugular', '29638'),
  ('epic-001', 'emp-928389', 'Botina de segurança N°', '43377'),
  ('epic-002', 'emp-928389', 'Óculos de segurança incolor', '19632'),
  ('epic-003', 'emp-928389', 'Óculos de segurança Fumê', '19632'),
  ('epic-004', 'emp-928389', 'Luva de vaqueta', '41152'),
  ('epic-005', 'emp-928389', 'Luva de raspa', '31262'),
  ('epic-006', 'emp-928389', 'Luva de anti vibração', '38257'),
  ('epic-007', 'emp-928389', 'Máscara Respiratória PFF-1', '38502'),
  ('epic-008', 'emp-928389', 'Protetor auricular tipo PLUG', '18189'),
  ('epic-009', 'emp-928389', 'Camisas de uniforme retardante a chamas', '30975'),
  ('epic-010', 'emp-928389', 'Calças de uniforme retardante a chamas', '34098'),
  ('epic-011', 'emp-928389', 'Camisas uniforme', '*****'),
  ('epic-012', 'emp-928389', 'Calças uniforme', '*****'),
  ('epic-013', 'emp-928389', 'Cinto de segurança com talabarte', '35994'),
  ('epic-014', 'emp-928389', 'Capacete de segurança c/ jugular', '34414'),
  ('epic-015', 'emp-928389', 'Óculos de segurança incolor', '11268'),
  ('epic-016', 'emp-928389', 'Óculos de segurança Fumê', '42716'),
  ('epic-017', 'emp-928389', 'Colete Refletivo', 'NBR15292'),
  ('epic-018', 'emp-928389', 'Protetor auricular tipo PLUG', '10403'),
  ('epic-019', 'emp-928389', 'Luva de raspa', '38098'),
  ('epic-020', 'emp-928389', 'Luva de vaqueta', '26742'),
  ('epic-021', 'emp-928389', 'Camisa retardante de chama - R2', '32393'),
  ('epic-022', 'emp-928389', 'Calça retardante de chama - R2', '32394'),
  ('epic-023', 'emp-928389', 'Cinto de segurança com duplo talabarte', '36228'),
  ('epic-024', 'emp-928389', 'Camisas uniforme - Risco 2', '41146'),
  ('epic-025', 'emp-928389', 'Calças uniforme - Risco 2', '41147'),
  ('epic-026', 'emp-928389', 'Cinto de Segurança com talabarte', '36810'),
  ('epic-027', 'emp-928389', 'Protetor facial - AS1000HAT-8S', '14969'),
  ('epic-028', 'emp-928389', 'Capacete de segurança c/ jugular', '31469'),
  ('epic-029', 'emp-928389', 'Botina de segurança N°', '15081'),
  ('epic-030', 'emp-928389', 'Luva Pigmentada', '10464'),
  ('epic-031', 'emp-928389', 'Capa de Chuva', '28191'),
  ('epic-032', 'emp-928389', 'Protetor solar  fator 30 fps', '***'),
  ('epic-033', 'emp-928389', 'Cinto de segurança com duplo talabarte', '35994'),
  ('epic-034', 'emp-928389', 'Capacete de segurança c/ jugular', '29792'),
  ('epic-035', 'emp-928389', 'Botina de segurança N°', '41419'),
  ('epic-036', 'emp-928389', 'Óculos de segurança incolor', '20702'),
  ('epic-037', 'emp-928389', 'Óculos de segurança Fumê', '20702'),
  ('epic-038', 'emp-928389', 'Máscara Respiratória PFF-1', '39238'),
  ('epic-039', 'emp-928389', 'Protetor auricular tipo PLUG', '19578'),
  ('epic-040', 'emp-928389', 'Luva pigmentada', '10857'),
  ('epic-041', 'emp-928389', 'Camisa social', '****'),
  ('epic-042', 'emp-928389', 'Luva Látex', '41782'),
  ('epic-043', 'emp-928389', 'Colete refletivo', '***'),
  ('epic-044', 'emp-928389', 'Camisas uniforme', '***'),
  ('epic-045', 'emp-928389', 'Calças uniforme', '***'),
  ('epic-046', 'emp-928389', 'Perneira em couro 3 talas com velcro', '39624'),
  ('epic-047', 'emp-928389', 'Luva de Raspa', '26381'),
  ('epic-048', 'emp-928389', 'Avental de Raspa', '20726'),
  ('epic-049', 'emp-928389', 'Perneira de Raspa', '20725'),
  ('epic-050', 'emp-928389', 'Mangote de Raspa', '20724'),
  ('epic-051', 'emp-928389', 'Cinto de Segurança c/ talabarte duplo', '28135'),
  ('epic-052', 'emp-928389', 'Botina de segurança N°40', '15081'),
  ('epic-053', 'emp-928389', 'Óculos de segurança', '19632')
on conflict (id) do nothing;

insert into epi_kit (id, empresa_id, grupo_id, qtde, ca, descricao, ordem) values
  ('epik-ajudante-00', 'emp-928389', 'epig-ajudante', 1, '29638', 'Capacete de segurança c/ jugular', 0),
  ('epik-ajudante-01', 'emp-928389', 'epig-ajudante', 1, '43377', 'Botina de segurança N°', 1),
  ('epik-ajudante-02', 'emp-928389', 'epig-ajudante', 1, '19632', 'Óculos de segurança incolor', 2),
  ('epik-ajudante-03', 'emp-928389', 'epig-ajudante', 1, '19632', 'Óculos de segurança Fumê', 3),
  ('epik-ajudante-04', 'emp-928389', 'epig-ajudante', 1, '41152', 'Luva de vaqueta', 4),
  ('epik-ajudante-05', 'emp-928389', 'epig-ajudante', 1, '31262', 'Luva de raspa', 5),
  ('epik-ajudante-06', 'emp-928389', 'epig-ajudante', 1, '38257', 'Luva de anti vibração', 6),
  ('epik-ajudante-07', 'emp-928389', 'epig-ajudante', 1, '38502', 'Máscara Respiratória PFF-1', 7),
  ('epik-ajudante-08', 'emp-928389', 'epig-ajudante', 1, '18189', 'Protetor auricular tipo PLUG', 8),
  ('epik-ajudante-09', 'emp-928389', 'epig-ajudante', 2, '30975', 'Camisas de uniforme retardante a chamas', 9),
  ('epik-ajudante-10', 'emp-928389', 'epig-ajudante', 2, '34098', 'Calças de uniforme retardante a chamas', 10),
  ('epik-ajudante-11', 'emp-928389', 'epig-ajudante', 2, '*****', 'Camisas uniforme', 11),
  ('epik-ajudante-12', 'emp-928389', 'epig-ajudante', 2, '*****', 'Calças uniforme', 12),
  ('epik-ajudante-13', 'emp-928389', 'epig-ajudante', 1, '35994', 'Cinto de segurança com talabarte', 13),
  ('epik-eletricista-00', 'emp-928389', 'epig-eletricista', 1, '34414', 'Capacete de segurança c/ jugular', 0),
  ('epik-eletricista-01', 'emp-928389', 'epig-eletricista', 1, '43377', 'Botina de segurança N°', 1),
  ('epik-eletricista-02', 'emp-928389', 'epig-eletricista', 1, '11268', 'Óculos de segurança incolor', 2),
  ('epik-eletricista-03', 'emp-928389', 'epig-eletricista', 1, '42716', 'Óculos de segurança Fumê', 3),
  ('epik-eletricista-04', 'emp-928389', 'epig-eletricista', 1, 'NBR15292', 'Colete Refletivo', 4),
  ('epik-eletricista-05', 'emp-928389', 'epig-eletricista', 1, '38502', 'Máscara Respiratória PFF-1', 5),
  ('epik-eletricista-06', 'emp-928389', 'epig-eletricista', 1, '10403', 'Protetor auricular tipo PLUG', 6),
  ('epik-eletricista-07', 'emp-928389', 'epig-eletricista', 1, '38098', 'Luva de raspa', 7),
  ('epik-eletricista-08', 'emp-928389', 'epig-eletricista', 1, '26742', 'Luva de vaqueta', 8),
  ('epik-eletricista-09', 'emp-928389', 'epig-eletricista', 1, '32393', 'Camisa retardante de chama - R2', 9),
  ('epik-eletricista-10', 'emp-928389', 'epig-eletricista', 1, '32394', 'Calça retardante de chama - R2', 10),
  ('epik-eletricista-11', 'emp-928389', 'epig-eletricista', 1, '36228', 'Cinto de segurança com duplo talabarte', 11),
  ('epik-eletricista-12', 'emp-928389', 'epig-eletricista', 2, '41146', 'Camisas uniforme - Risco 2', 12),
  ('epik-eletricista-13', 'emp-928389', 'epig-eletricista', 2, '41147', 'Calças uniforme - Risco 2', 13),
  ('epik-eletricista-14', 'emp-928389', 'epig-eletricista', 1, '36810', 'Cinto de Segurança com talabarte', 14),
  ('epik-eletricista-15', 'emp-928389', 'epig-eletricista', 1, '14969', 'Protetor facial - AS1000HAT-8S', 15),
  ('epik-mecanico-montador-00', 'emp-928389', 'epig-mecanico-montador', 1, '31469', 'Capacete de segurança c/ jugular', 0),
  ('epik-mecanico-montador-01', 'emp-928389', 'epig-mecanico-montador', 1, '15081', 'Botina de segurança N°', 1),
  ('epik-mecanico-montador-02', 'emp-928389', 'epig-mecanico-montador', 1, '19632', 'Óculos de segurança incolor', 2),
  ('epik-mecanico-montador-03', 'emp-928389', 'epig-mecanico-montador', 1, '19632', 'Óculos de segurança Fumê', 3),
  ('epik-mecanico-montador-04', 'emp-928389', 'epig-mecanico-montador', 1, '10464', 'Luva Pigmentada', 4),
  ('epik-mecanico-montador-05', 'emp-928389', 'epig-mecanico-montador', 1, '26742', 'Luva de vaqueta', 5),
  ('epik-mecanico-montador-06', 'emp-928389', 'epig-mecanico-montador', 1, '38502', 'Máscara Respiratória PFF-1', 6),
  ('epik-mecanico-montador-07', 'emp-928389', 'epig-mecanico-montador', 1, '18189', 'Protetor auricular tipo PLUG', 7),
  ('epik-mecanico-montador-08', 'emp-928389', 'epig-mecanico-montador', 1, '28191', 'Capa de Chuva', 8),
  ('epik-mecanico-montador-09', 'emp-928389', 'epig-mecanico-montador', 1, '***', 'Protetor solar  fator 30 fps', 9),
  ('epik-mecanico-montador-10', 'emp-928389', 'epig-mecanico-montador', 2, '*****', 'Camisas uniforme', 10),
  ('epik-mecanico-montador-11', 'emp-928389', 'epig-mecanico-montador', 2, '*****', 'Calças uniforme', 11),
  ('epik-mecanico-montador-12', 'emp-928389', 'epig-mecanico-montador', 1, '35994', 'Cinto de segurança com duplo talabarte', 12),
  ('epik-supervisor-00', 'emp-928389', 'epig-supervisor', 1, '29792', 'Capacete de segurança c/ jugular', 0),
  ('epik-supervisor-01', 'emp-928389', 'epig-supervisor', 1, '41419', 'Botina de segurança N°', 1),
  ('epik-supervisor-02', 'emp-928389', 'epig-supervisor', 1, '20702', 'Óculos de segurança incolor', 2),
  ('epik-supervisor-03', 'emp-928389', 'epig-supervisor', 1, '20702', 'Óculos de segurança Fumê', 3),
  ('epik-supervisor-04', 'emp-928389', 'epig-supervisor', 1, 'NBR15292', 'Colete Refletivo', 4),
  ('epik-supervisor-05', 'emp-928389', 'epig-supervisor', 1, '39238', 'Máscara Respiratória PFF-1', 5),
  ('epik-supervisor-06', 'emp-928389', 'epig-supervisor', 1, '19578', 'Protetor auricular tipo PLUG', 6),
  ('epik-supervisor-07', 'emp-928389', 'epig-supervisor', 1, '10857', 'Luva pigmentada', 7),
  ('epik-supervisor-08', 'emp-928389', 'epig-supervisor', 2, '****', 'Camisa social', 8),
  ('epik-supervisor-09', 'emp-928389', 'epig-supervisor', 1, '35994', 'Cinto de segurança com duplo talabarte', 9),
  ('epik-tec-seg-trabalho-00', 'emp-928389', 'epig-tec-seg-trabalho', 1, '31469', 'Capacete de segurança c/ jugular', 0),
  ('epik-tec-seg-trabalho-01', 'emp-928389', 'epig-tec-seg-trabalho', 1, '15081', 'Botina de segurança N°', 1),
  ('epik-tec-seg-trabalho-02', 'emp-928389', 'epig-tec-seg-trabalho', 1, '19632', 'Óculos de segurança incolor', 2),
  ('epik-tec-seg-trabalho-03', 'emp-928389', 'epig-tec-seg-trabalho', 1, '19632', 'Óculos de segurança Fumê', 3),
  ('epik-tec-seg-trabalho-04', 'emp-928389', 'epig-tec-seg-trabalho', 1, '10464', 'Luva Pigmentada', 4),
  ('epik-tec-seg-trabalho-05', 'emp-928389', 'epig-tec-seg-trabalho', 1, '41782', 'Luva Látex', 5),
  ('epik-tec-seg-trabalho-06', 'emp-928389', 'epig-tec-seg-trabalho', 1, '38502', 'Máscara Respiratória PFF-1', 6),
  ('epik-tec-seg-trabalho-07', 'emp-928389', 'epig-tec-seg-trabalho', 1, '18189', 'Protetor auricular tipo PLUG', 7),
  ('epik-tec-seg-trabalho-08', 'emp-928389', 'epig-tec-seg-trabalho', 1, '28191', 'Capa de Chuva', 8),
  ('epik-tec-seg-trabalho-09', 'emp-928389', 'epig-tec-seg-trabalho', 1, '***', 'Protetor solar  fator 30 fps', 9),
  ('epik-tec-seg-trabalho-10', 'emp-928389', 'epig-tec-seg-trabalho', 2, '****', 'Camisa social', 10),
  ('epik-tec-seg-trabalho-11', 'emp-928389', 'epig-tec-seg-trabalho', 1, '35994', 'Cinto de segurança com duplo talabarte', 11),
  ('epik-administracao-00', 'emp-928389', 'epig-administracao', 1, '31469', 'Capacete de segurança c/ jugular', 0),
  ('epik-administracao-01', 'emp-928389', 'epig-administracao', 1, '15081', 'Botina de segurança N°', 1),
  ('epik-administracao-02', 'emp-928389', 'epig-administracao', 1, '***', 'Colete refletivo', 2),
  ('epik-administracao-03', 'emp-928389', 'epig-administracao', 1, '***', 'Protetor solar  fator 30 fps', 3),
  ('epik-motorista-00', 'emp-928389', 'epig-motorista', 1, '31469', 'Capacete de segurança c/ jugular', 0),
  ('epik-motorista-01', 'emp-928389', 'epig-motorista', 1, '15081', 'Botina de segurança N°', 1),
  ('epik-motorista-02', 'emp-928389', 'epig-motorista', 1, '19632', 'Óculos de segurança Incolor', 2),
  ('epik-motorista-03', 'emp-928389', 'epig-motorista', 1, '19632', 'Óculos de segurança Fumê', 3),
  ('epik-motorista-04', 'emp-928389', 'epig-motorista', 1, '10464', 'Luva Pigmentada', 4),
  ('epik-motorista-05', 'emp-928389', 'epig-motorista', 1, '18189', 'Protetor auricular tipo PLUG', 5),
  ('epik-motorista-06', 'emp-928389', 'epig-motorista', 2, '***', 'Camisas uniforme', 6),
  ('epik-motorista-07', 'emp-928389', 'epig-motorista', 2, '***', 'Calças uniforme', 7),
  ('epik-motorista-08', 'emp-928389', 'epig-motorista', 1, '38502', 'Máscara Respiratória PFF-1', 8),
  ('epik-motorista-09', 'emp-928389', 'epig-motorista', 1, '***', 'Colete refletivo', 9),
  ('epik-motorista-10', 'emp-928389', 'epig-motorista', 1, '39624', 'Perneira em couro 3 talas com velcro', 10),
  ('epik-soldador-00', 'emp-928389', 'epig-soldador', 1, '31469', 'Capacete de segurança c/ jugular', 0),
  ('epik-soldador-01', 'emp-928389', 'epig-soldador', 1, '15081', 'Botina de segurança N°', 1),
  ('epik-soldador-02', 'emp-928389', 'epig-soldador', 1, '19632', 'Óculos de segurança Fumê', 2),
  ('epik-soldador-03', 'emp-928389', 'epig-soldador', 1, '26381', 'Luva de Raspa', 3),
  ('epik-soldador-04', 'emp-928389', 'epig-soldador', 1, '20726', 'Avental de Raspa', 4),
  ('epik-soldador-05', 'emp-928389', 'epig-soldador', 1, '20725', 'Perneira de Raspa', 5),
  ('epik-soldador-06', 'emp-928389', 'epig-soldador', 1, '20724', 'Mangote de Raspa', 6),
  ('epik-soldador-07', 'emp-928389', 'epig-soldador', 1, '18189', 'Protetor auricular tipo PLUG', 7),
  ('epik-soldador-08', 'emp-928389', 'epig-soldador', 1, '***', 'Protetor solar  fator 30 fps', 8),
  ('epik-soldador-09', 'emp-928389', 'epig-soldador', 2, '***', 'Camisas uniforme', 9),
  ('epik-soldador-10', 'emp-928389', 'epig-soldador', 2, '***', 'Calças uniforme', 10),
  ('epik-soldador-11', 'emp-928389', 'epig-soldador', 1, '28135', 'Cinto de Segurança c/ talabarte duplo', 11),
  ('epik-compras-00', 'emp-928389', 'epig-compras', 1, '31469', 'Capacete de segurança c/ jugular', 0),
  ('epik-compras-01', 'emp-928389', 'epig-compras', 1, '15081', 'Botina de segurança N°40', 1),
  ('epik-compras-02', 'emp-928389', 'epig-compras', 1, '19632', 'Óculos de segurança', 2),
  ('epik-compras-03', 'emp-928389', 'epig-compras', 1, '18189', 'Protetor auricular tipo PLUG', 3),
  ('epik-compras-04', 'emp-928389', 'epig-compras', 1, '***', 'Colete refletivo', 4)
on conflict (id) do nothing;

-- Palpite automático pelo nome da função. Dá para corrigir na tela.
insert into epi_funcao_grupo (id, empresa_id, funcao, grupo_id) values
  ('epif-000', 'emp-928389', 'AJUDANTE DE ELETRICISTA', 'epig-ajudante'),
  ('epif-001', 'emp-928389', 'ALMOXARIFE I', 'epig-administracao'),
  ('epif-002', 'emp-928389', 'ALMOXARIFE III', 'epig-administracao'),
  ('epif-003', 'emp-928389', 'ASSIST. ADM. I', 'epig-administracao'),
  ('epif-004', 'emp-928389', 'ASSIST. TEC. ENERGIA E MANUT', 'epig-administracao'),
  ('epif-005', 'emp-928389', 'ASSIST. TEC. ENERGIA E MANUT.', 'epig-administracao'),
  ('epif-006', 'emp-928389', 'ASSIST. TECNICO I', 'epig-administracao'),
  ('epif-007', 'emp-928389', 'ASSIST. TECNICO II', 'epig-administracao'),
  ('epif-008', 'emp-928389', 'AUX DE ALMOX I', 'epig-administracao'),
  ('epif-009', 'emp-928389', 'AUX DE ALMOX II', 'epig-administracao'),
  ('epif-010', 'emp-928389', 'AUX DE ALMOX III', 'epig-administracao'),
  ('epif-011', 'emp-928389', 'AUX. ADMINISTRATIVO I', 'epig-administracao'),
  ('epif-012', 'emp-928389', 'AUX. TEC. DE S. TRABALHO II', 'epig-tec-seg-trabalho'),
  ('epif-013', 'emp-928389', 'COMPRADOR', 'epig-compras'),
  ('epif-014', 'emp-928389', 'ELETRICISTA F/C I', 'epig-eletricista'),
  ('epif-015', 'emp-928389', 'ELETRICISTA F/C II', 'epig-eletricista'),
  ('epif-016', 'emp-928389', 'ELETRICISTA F/C III', 'epig-eletricista'),
  ('epif-017', 'emp-928389', 'ELETRICISTA MONTADOR I', 'epig-eletricista'),
  ('epif-018', 'emp-928389', 'ELETRICISTA MONTADOR II', 'epig-eletricista'),
  ('epif-019', 'emp-928389', 'ELETRICISTA MONTADOR III', 'epig-eletricista'),
  ('epif-020', 'emp-928389', 'ENC. ADM III', 'epig-administracao'),
  ('epif-021', 'emp-928389', 'ENC. DE ELETRICA I', 'epig-eletricista'),
  ('epif-022', 'emp-928389', 'ENC. DE ELETRICA II', 'epig-eletricista'),
  ('epif-023', 'emp-928389', 'ENC. DE ELETRICA III', 'epig-eletricista'),
  ('epif-024', 'emp-928389', 'ENC° DE ALMOXARIFADO I', 'epig-administracao'),
  ('epif-025', 'emp-928389', 'ENC° DE ALMOXARIFADO III', 'epig-administracao'),
  ('epif-026', 'emp-928389', 'ENC° DE MONTAGEM III', 'epig-mecanico-montador'),
  ('epif-027', 'emp-928389', 'ENC° OBRA E MAN. II', 'epig-supervisor'),
  ('epif-028', 'emp-928389', 'ENGENHARIA DE PLANEJAMENTO I', 'epig-supervisor'),
  ('epif-029', 'emp-928389', 'ENGENHEIRO CIVIL', 'epig-supervisor'),
  ('epif-030', 'emp-928389', 'ENGENHEIRO JUNIOR', 'epig-supervisor'),
  ('epif-031', 'emp-928389', 'ENGENHEIRO PLENO', 'epig-supervisor'),
  ('epif-032', 'emp-928389', 'ENGENHEIRO.SENIOR', 'epig-supervisor'),
  ('epif-033', 'emp-928389', 'LIDER DE ELETRICA I', 'epig-eletricista'),
  ('epif-034', 'emp-928389', 'LIDER DE TRANSPORTE III', 'epig-motorista'),
  ('epif-035', 'emp-928389', 'LIDER MECANICA I', 'epig-mecanico-montador'),
  ('epif-036', 'emp-928389', 'LIDER MECANICA II', 'epig-mecanico-montador'),
  ('epif-037', 'emp-928389', 'MECANICO MONTADOR I', 'epig-mecanico-montador'),
  ('epif-038', 'emp-928389', 'MECANICO MONTADOR II', 'epig-mecanico-montador'),
  ('epif-039', 'emp-928389', 'MECANICO MONTADOR III', 'epig-mecanico-montador'),
  ('epif-040', 'emp-928389', 'MEIO OFICIAL ELETRICISTA', 'epig-eletricista'),
  ('epif-041', 'emp-928389', 'MEIO OFICIAL MECÂNICO', 'epig-mecanico-montador'),
  ('epif-042', 'emp-928389', 'MESTRE DE ELETRICA I', 'epig-eletricista'),
  ('epif-043', 'emp-928389', 'MESTRE DE ELETRICA II', 'epig-eletricista'),
  ('epif-044', 'emp-928389', 'MESTRE DE ELETRICA III', 'epig-eletricista'),
  ('epif-045', 'emp-928389', 'MONT. DE ANDAIME III', 'epig-ajudante'),
  ('epif-046', 'emp-928389', 'MOTORISTA II', 'epig-motorista'),
  ('epif-047', 'emp-928389', 'OPERADOR DE MUNCK I', 'epig-motorista'),
  ('epif-048', 'emp-928389', 'OPERADOR DE RODOFERROVIARISTA I', 'epig-motorista'),
  ('epif-049', 'emp-928389', 'PEDREIRO I', 'epig-ajudante'),
  ('epif-050', 'emp-928389', 'QUALIDADE', 'epig-supervisor'),
  ('epif-051', 'emp-928389', 'SINALEIRO', 'epig-ajudante'),
  ('epif-052', 'emp-928389', 'SOLDADOR III', 'epig-soldador'),
  ('epif-053', 'emp-928389', 'SUPERVISOR DE ELETRICA I', 'epig-eletricista'),
  ('epif-054', 'emp-928389', 'SUPERVISOR DE ELETRICA II', 'epig-eletricista'),
  ('epif-055', 'emp-928389', 'SUPERVISOR DE OBRA III', 'epig-supervisor'),
  ('epif-056', 'emp-928389', 'TÉC. SEG. DO TRABALHO I', 'epig-tec-seg-trabalho'),
  ('epif-057', 'emp-928389', 'TÉC. SEG. DO TRABALHO II', 'epig-tec-seg-trabalho'),
  ('epif-058', 'emp-928389', 'TÉC. SEG. DO TRABALHO III', 'epig-tec-seg-trabalho'),
  ('epif-059', 'emp-928389', 'TÉCNICA EM SEGURANÇA DO TRABALHO', 'epig-tec-seg-trabalho'),
  ('epif-060', 'emp-928389', 'TECNICO DE OBRAS', 'epig-supervisor')
on conflict (id) do nothing;

-- ── Conferência ──────────────────────────────────────────────────────
select g.nome as grupo,
       (select count(*) from epi_kit k where k.grupo_id = g.id)          as itens_no_kit,
       (select count(*) from epi_funcao_grupo f where f.grupo_id = g.id) as funcoes
  from epi_grupos g where g.empresa_id = 'emp-928389'
 order by g.ordem;
