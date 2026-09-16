import initSqlJs, { Database } from 'sql.js';
import fs from 'fs';
import path from 'path';

// Diretório de dados:
//  - Local: ./database (padrão)
//  - Railway: aponte DATABASE_DIR para o mount point do Volume (ex.: /data)
//    Sem um Volume, o disco do Railway é EFÊMERO e os dados somem a cada deploy.
const DATA_DIR = process.env.DATABASE_DIR || path.join(process.cwd(), 'database');

// O schema.sql vem sempre do repositório, não do volume de dados
const SCHEMA_DIR = path.join(process.cwd(), 'database');

const DB_FILE = path.join(DATA_DIR, 'sistema.sqlite');
const SCHEMA_FILE = path.join(SCHEMA_DIR, 'schema.sql');

let db: Database | null = null;

export async function getDb(): Promise<Database> {
  if (db) return db;

  const SQL = await initSqlJs({
    locateFile: (file: string) => path.join(process.cwd(), "node_modules", "sql.js", "dist", file)
  });

  // Ensure database folder exists
  const dbDir = path.dirname(DB_FILE);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  // Load existing database file if available and valid
  if (fs.existsSync(DB_FILE)) {
    try {
      const filebuffer = fs.readFileSync(DB_FILE);
      if (filebuffer.length > 0) {
        db = new SQL.Database(new Uint8Array(filebuffer));
        db.exec("SELECT 1");
      }
    } catch (err) {
      console.warn('Banco existente corrompido ou incompatível, recriando...', err);
      try {
        fs.unlinkSync(DB_FILE);
      } catch {}
      db = null;
    }
  }

  if (!db) {
    db = new SQL.Database();
  }

  // Run schema
  if (fs.existsSync(SCHEMA_FILE)) {
    try {
      const schema = fs.readFileSync(SCHEMA_FILE, 'utf8');
      db.run(schema);
    } catch (err) {
      console.error('Erro ao executar schema:', err);
    }
  }

  // Ensure tables exist
  try {
    db.run(`
      CREATE TABLE IF NOT EXISTS empresas (
        id TEXT PRIMARY KEY,
        nome TEXT NOT NULL,
        razaoSocial TEXT,
        cnpj TEXT NOT NULL UNIQUE,
        segmento TEXT DEFAULT 'Construção Civil & Infraestrutura',
        corPrimaria TEXT DEFAULT '#176B87',
        logoUrl TEXT,
        obrasCount INTEGER DEFAULT 0,
        colaboradoresCount INTEGER DEFAULT 0,
        status TEXT DEFAULT 'ativa',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);
  } catch {}

  try {
    db.run(`
      CREATE TABLE IF NOT EXISTS cargos (
        id TEXT PRIMARY KEY,
        empresa_id TEXT NOT NULL,
        nome TEXT NOT NULL,
        descricao TEXT DEFAULT '',
        status TEXT NOT NULL DEFAULT 'ativo',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE
      );
    `);
  } catch {}

  try {
    db.run(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id TEXT PRIMARY KEY,
        nome TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        senha TEXT,
        cargo_id TEXT DEFAULT '',
        cargo TEXT NOT NULL,
        perfil TEXT NOT NULL DEFAULT 'operacional',
        empresa_id TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'ativo',
        telefone TEXT DEFAULT '',
        departamento TEXT DEFAULT '',
        permissoes TEXT DEFAULT '[]',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);
  } catch {}

  try {
    db.run(`
      CREATE TABLE IF NOT EXISTS cargos_permissoes (
        id TEXT PRIMARY KEY,
        empresa_id TEXT NOT NULL,
        cargo_id TEXT NOT NULL,
        modulo TEXT NOT NULL,
        visualizar INTEGER DEFAULT 1,
        criar INTEGER DEFAULT 0,
        editar INTEGER DEFAULT 0,
        excluir INTEGER DEFAULT 0,
        solicitar INTEGER DEFAULT 1,
        aprovar INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE,
        FOREIGN KEY (cargo_id) REFERENCES cargos(id) ON DELETE CASCADE,
        UNIQUE(cargo_id, modulo)
      );
    `);
  } catch {}

  try {
    db.run(`
      CREATE TABLE IF NOT EXISTS solicitacoes_alteracao (
        id TEXT PRIMARY KEY,
        codigo_sequencial INTEGER,
        empresa_id TEXT NOT NULL,
        modulo TEXT NOT NULL,
        registro_id TEXT NOT NULL,
        registro_identificador TEXT NOT NULL,
        solicitante_id TEXT NOT NULL,
        solicitante_nome TEXT NOT NULL,
        solicitante_cargo TEXT NOT NULL,
        campo TEXT NOT NULL,
        valor_atual TEXT,
        valor_solicitado TEXT,
        dados_anteriores TEXT,
        dados_solicitados TEXT,
        status TEXT NOT NULL DEFAULT 'pendente',
        aprovador_id TEXT,
        aprovador_nome TEXT,
        aprovador_cargo TEXT,
        data_aprovacao DATETIME,
        motivo_recusa TEXT,
        observacoes TEXT,
        data_solicitacao DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE
      );
    `);
  } catch {}

  try {
    db.run(`
      CREATE TABLE IF NOT EXISTS colaboradores (
        id TEXT PRIMARY KEY,
        empresa_id TEXT NOT NULL,
        nome TEXT NOT NULL,
        funcao TEXT NOT NULL,
        cpf TEXT NOT NULL,
        rg TEXT DEFAULT '',
        numero_chapa TEXT DEFAULT '',
        obra_id TEXT NOT NULL,
        data_admissao TEXT NOT NULL,
        data_aso TEXT DEFAULT '',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS solicitacoes_historico (
        id TEXT PRIMARY KEY,
        solicitacao_id TEXT NOT NULL,
        tipo_evento TEXT NOT NULL,
        usuario_id TEXT NOT NULL,
        usuario_nome TEXT NOT NULL,
        usuario_cargo TEXT,
        detalhes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (solicitacao_id) REFERENCES solicitacoes_alteracao(id) ON DELETE CASCADE
      );
    `);
  } catch {}

  // Ensure new columns exist for existing tables
  try {
    db.run("ALTER TABLE usuarios ADD COLUMN cargo_id TEXT DEFAULT ''");
  } catch {}
  try {
    db.run("ALTER TABLE admissoes ADD COLUMN data_exame TEXT DEFAULT ''");
  } catch {}
  try {
    db.run("ALTER TABLE admissoes ADD COLUMN data_aso TEXT DEFAULT ''");
  } catch {}
  try {
    db.run("ALTER TABLE admissoes ADD COLUMN empresa_id TEXT DEFAULT 'emp-001'");
  } catch {}
  try {
    db.run("ALTER TABLE obras ADD COLUMN empresa_id TEXT DEFAULT 'emp-001'");
  } catch {}

  // Check if initial seed for empresas is needed
  try {
    const resEmp = db.exec("SELECT COUNT(*) as count FROM empresas");
    const countEmp = (resEmp[0]?.values[0]?.[0] as number) || 0;
    if (countEmp === 0) {
      seedDefaultEmpresas(db);
    }
  } catch {
    seedDefaultEmpresas(db);
  }

  // Check if initial seed for cargos is needed
  try {
    const resCrg = db.exec("SELECT COUNT(*) as count FROM cargos");
    const countCrg = (resCrg[0]?.values[0]?.[0] as number) || 0;
    if (countCrg === 0) {
      seedDefaultCargos(db);
    }
  } catch {
    seedDefaultCargos(db);
  }

  // Check if initial seed for cargos_permissoes is needed
  try {
    const resPerm = db.exec("SELECT COUNT(*) as count FROM cargos_permissoes");
    const countPerm = (resPerm[0]?.values[0]?.[0] as number) || 0;
    if (countPerm === 0) {
      seedDefaultPermissoes(db);
    }
  } catch {
    seedDefaultPermissoes(db);
  }

  // Check if initial seed for solicitacoes is needed
  try {
    const resSol = db.exec("SELECT COUNT(*) as count FROM solicitacoes_alteracao");
    const countSol = (resSol[0]?.values[0]?.[0] as number) || 0;
    if (countSol === 0) {
      seedDefaultSolicitacoes(db);
    }
  } catch {
    seedDefaultSolicitacoes(db);
  }

  // Check if initial seed for usuarios is needed
  try {
    const resUsr = db.exec("SELECT COUNT(*) as count FROM usuarios");
    const countUsr = (resUsr[0]?.values[0]?.[0] as number) || 0;
    if (countUsr === 0) {
      seedDefaultUsuarios(db);
    }
  } catch {
    seedDefaultUsuarios(db);
  }

  // Check if initial seed for obras is needed
  try {
    const res = db.exec("SELECT COUNT(*) as count FROM obras");
    const count = (res[0]?.values[0]?.[0] as number) || 0;

    if (count === 0) {
      seedDefaultObras(db);
      saveDbToDisk();
    }
  } catch (err) {
    seedDefaultObras(db);
    saveDbToDisk();
  }

  saveDbToDisk();

  return db;
}

export function saveDbToDisk() {
  if (!db) return;
  try {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_FILE, buffer);
  } catch (err) {
    console.error('Erro ao salvar banco de dados em disco:', err);
  }
}

function seedDefaultEmpresas(database: Database) {
  const initialEmpresas = [
    {
      id: 'emp-001',
      nome: 'Construtora Horizonte',
      razaoSocial: 'Horizonte Construções & Engenharia S/A',
      cnpj: '12.345.678/0001-90',
      segmento: 'Construção Civil & Infraestrutura',
      corPrimaria: '#176B87',
      logoUrl: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=160&auto=format&fit=crop&q=80',
      obrasCount: 5,
      colaboradoresCount: 42,
      status: 'ativa',
    },
    {
      id: 'emp-002',
      nome: 'Vanguarda Obras e Estruturas',
      razaoSocial: 'Vanguarda Empreendimentos Imobiliários Ltda',
      cnpj: '98.765.432/0001-10',
      segmento: 'Edificações Residenciais & Comerciais',
      corPrimaria: '#0284C7',
      logoUrl: 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=160&auto=format&fit=crop&q=80',
      obrasCount: 3,
      colaboradoresCount: 29,
      status: 'ativa',
    },
    {
      id: 'emp-003',
      nome: 'Pinnacle Engenharia Pesada',
      razaoSocial: 'Pinnacle Infraestrutura Rodoviária e Pontes S/A',
      cnpj: '45.678.901/0001-23',
      segmento: 'Pontes, Viadutos & Rodovias',
      corPrimaria: '#D97706',
      logoUrl: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=160&auto=format&fit=crop&q=80',
      obrasCount: 4,
      colaboradoresCount: 65,
      status: 'ativa',
    },
    {
      id: 'emp-004',
      nome: 'Delta Instalações & Montagens',
      razaoSocial: 'Delta Engenharia Industrial & Manutenção Ltda',
      cnpj: '33.222.111/0001-55',
      segmento: 'Montagens Industriais & Elétricas',
      corPrimaria: '#059669',
      logoUrl: 'https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=160&auto=format&fit=crop&q=80',
      obrasCount: 2,
      colaboradoresCount: 18,
      status: 'ativa',
    },
  ];

  const stmt = database.prepare(
    "INSERT INTO empresas (id, nome, razaoSocial, cnpj, segmento, corPrimaria, logoUrl, obrasCount, colaboradoresCount, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)"
  );

  for (const emp of initialEmpresas) {
    stmt.run([
      emp.id,
      emp.nome,
      emp.razaoSocial,
      emp.cnpj,
      emp.segmento,
      emp.corPrimaria,
      emp.logoUrl,
      emp.obrasCount,
      emp.colaboradoresCount,
      emp.status,
    ]);
  }
  stmt.free();
}

function seedDefaultCargos(database: Database) {
  const initialCargos = [
    // Construtora Horizonte (emp-001)
    { id: 'crg-hor-01', empresa_id: 'emp-001', nome: 'Encarregado Geral', descricao: 'Supervisão de frentes de obra e equipes operacionais', status: 'ativo' },
    { id: 'crg-hor-02', empresa_id: 'emp-001', nome: 'Pedreiro', descricao: 'Execução de alvenaria e acabamentos estruturais', status: 'ativo' },
    { id: 'crg-hor-03', empresa_id: 'emp-001', nome: 'Almoxarife', descricao: 'Gestão de materiais e controle de estoque do canteiro', status: 'ativo' },
    { id: 'crg-hor-04', empresa_id: 'emp-001', nome: 'Assistente Administrativo', descricao: 'Suporte às rotinas de DP e escritório de obra', status: 'ativo' },
    { id: 'crg-hor-05', empresa_id: 'emp-001', nome: 'Engenheiro Civil', descricao: 'Responsabilidade técnica e fiscalização de obras', status: 'ativo' },

    // Pinnacle Engenharia Pesada (emp-003)
    { id: 'crg-pin-01', empresa_id: 'emp-003', nome: 'Encarregado de Terraplenagem', descricao: 'Liderança de equipes pesadas de terraplenagem e pavimentação', status: 'ativo' },
    { id: 'crg-pin-02', empresa_id: 'emp-003', nome: 'Assistente Técnico de Engenharia', descricao: 'Controle tecnológico e apoio aos engenheiros de campo', status: 'ativo' },
    { id: 'crg-pin-03', empresa_id: 'emp-003', nome: 'Mestre de Obras', descricao: 'Coordenação executiva no canteiro de obras rodoviárias', status: 'ativo' },
    { id: 'crg-pin-04', empresa_id: 'emp-003', nome: 'Engenheiro de Campo', descricao: 'Fiscalização técnica e cumprimento de cronograma', status: 'ativo' },
    { id: 'crg-pin-05', empresa_id: 'emp-003', nome: 'Operador de Escavadeira', descricao: 'Operação segura de maquinário pesado', status: 'ativo' },

    // Vanguarda Obras e Estruturas (emp-002)
    { id: 'crg-van-01', empresa_id: 'emp-002', nome: 'Encarregado de Armação', descricao: 'Gestão das equipes de ferragem e concreto', status: 'ativo' },
    { id: 'crg-van-02', empresa_id: 'emp-002', nome: 'Engenheiro Residente', descricao: 'Responsável técnico pelo empreendimento imobiliário', status: 'ativo' },
    { id: 'crg-van-03', empresa_id: 'emp-002', nome: 'Técnico de Segurança do Trabalho', descricao: 'Prevenção de acidentes e conformidade com NRs', status: 'ativo' },
    { id: 'crg-van-04', empresa_id: 'emp-002', nome: 'Eletricista Predial', descricao: 'Instalações elétricas residenciais e comerciais', status: 'ativo' },

    // Delta Instalações & Montagens (emp-004)
    { id: 'crg-del-01', empresa_id: 'emp-004', nome: 'Montador Industrial', descricao: 'Montagem de estruturas metálicas e tubulações', status: 'ativo' },
    { id: 'crg-del-02', empresa_id: 'emp-004', nome: 'Soldador TIG / Eletrodo', descricao: 'Soldagem especializada em alta precisão', status: 'ativo' },
    { id: 'crg-del-03', empresa_id: 'emp-004', nome: 'Encarregado de Montagem', descricao: 'Supervisão técnica de montagens industriais', status: 'ativo' },
    { id: 'crg-del-04', empresa_id: 'emp-004', nome: 'Auxiliar Técnico', descricao: 'Apoio geral em montagens elétricas e mecânicas', status: 'ativo' },
  ];

  const stmt = database.prepare(
    "INSERT OR REPLACE INTO cargos (id, empresa_id, nome, descricao, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)"
  );

  for (const crg of initialCargos) {
    stmt.run([crg.id, crg.empresa_id, crg.nome, crg.descricao, crg.status]);
  }
  stmt.free();
}

function seedDefaultUsuarios(database: Database) {
  const initialUsuarios = [
    {
      id: 'usr-master-001',
      nome: 'Fabrício Oliveira',
      email: 'fabriciooliveira2431@gmail.com',
      senha: 'Admin@2026',
      cargo: 'Diretor / Administrador Geral',
      perfil: 'master_admin',
      empresa_id: 'emp-001',
      status: 'ativo',
      telefone: '(11) 98765-4321',
      departamento: 'Diretoria Executiva',
      permissoes: JSON.stringify(['all', 'usuarios', 'empresas', 'admissoes', 'obras', 'relatorios']),
    },
    {
      id: 'usr-002',
      nome: 'Mariana Silva Santos',
      email: 'mariana.silva@horizonte.com.br',
      senha: 'user123',
      cargo: 'Coordenadora de Recursos Humanos',
      perfil: 'gestor_rh',
      empresa_id: 'emp-001',
      status: 'ativo',
      telefone: '(11) 97123-4567',
      departamento: 'Recursos Humanos',
      permissoes: JSON.stringify(['admissoes', 'relatorios']),
    },
    {
      id: 'usr-003',
      nome: 'Eng. Ricardo Mendes',
      email: 'ricardo.mendes@vanguarda.com.br',
      senha: 'user123',
      cargo: 'Engenheiro Residente',
      perfil: 'engenheiro',
      empresa_id: 'emp-002',
      status: 'ativo',
      telefone: '(21) 99876-5432',
      departamento: 'Operações & Engenharia',
      permissoes: JSON.stringify(['obras', 'admissoes']),
    },
  ];

  const stmt = database.prepare(
    "INSERT INTO usuarios (id, nome, email, senha, cargo, perfil, empresa_id, status, telefone, departamento, permissoes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)"
  );

  for (const usr of initialUsuarios) {
    stmt.run([
      usr.id,
      usr.nome,
      usr.email,
      usr.senha,
      usr.cargo,
      usr.perfil,
      usr.empresa_id,
      usr.status,
      usr.telefone,
      usr.departamento,
      usr.permissoes,
    ]);
  }
  stmt.free();
}

function seedDefaultObras(database: Database) {
  const initialObras = [
    { id: 'obra-001', nome: 'Obra Centro Empresarial Horizon', codigo: 'OBR-001' },
    { id: 'obra-002', nome: 'Obra Ponte JK Expansão Sul', codigo: 'OBR-002' },
    { id: 'obra-003', nome: 'Obra Residencial Parque das Flores', codigo: 'OBR-003' },
    { id: 'obra-004', nome: 'Obra Complexo Industrial Norte', codigo: 'OBR-004' },
    { id: 'obra-005', nome: 'Obra Arena Multiuso Capital', codigo: 'OBR-005' },
  ];

  const stmt = database.prepare(
    "INSERT INTO obras (id, nome, codigo, created_at, updated_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)"
  );

  for (const obra of initialObras) {
    stmt.run([obra.id, obra.nome, obra.codigo]);
  }
  stmt.free();

  // Seed sample admissions to make testing immediate and smooth!
  const sampleAdmissoes = [
    {
      id: 'adm-101',
      nome: 'Carlos Eduardo Silva',
      funcao: 'Engenheiro Civil',
      cpf: '12345678909',
      rg: '1234567-SSP/SP',
      data_nascimento: '1988-05-14',
      obra_id: 'obra-001',
      data_exame: '2026-08-15',
      data_aso: '2026-08-18',
      previsao_contratacao: '2026-09-01',
    },
    {
      id: 'adm-102',
      nome: 'Mariana Costa Rodrigues',
      funcao: 'Técnica em Segurança do Trabalho',
      cpf: '98765432100',
      rg: '9876543-SSP/RJ',
      data_nascimento: '1992-11-20',
      obra_id: 'obra-002',
      data_exame: '2026-08-12',
      data_aso: '2026-08-14',
      previsao_contratacao: '2026-08-25',
    },
    {
      id: 'adm-103',
      nome: 'Roberto Alves Santos',
      funcao: 'Mestre de Obras',
      cpf: '45678912300',
      rg: '4567891-SSP/MG',
      data_nascimento: '1980-03-10',
      obra_id: 'obra-001',
      data_exame: '2026-08-20',
      data_aso: '2026-08-22',
      previsao_contratacao: '2026-09-05',
    },
  ];

  const admStmt = database.prepare(
    "INSERT INTO admissoes (id, nome, funcao, cpf, rg, data_nascimento, obra_id, data_exame, data_aso, previsao_contratacao, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)"
  );

  for (const adm of sampleAdmissoes) {
    admStmt.run([
      adm.id,
      adm.nome,
      adm.funcao,
      adm.cpf,
      adm.rg,
      adm.data_nascimento,
      adm.obra_id,
      adm.data_exame,
      adm.data_aso,
      adm.previsao_contratacao,
    ]);
  }
  admStmt.free();
}

function seedDefaultPermissoes(database: Database) {
  const modulos = ['efetivo', 'obras', 'documentos', 'rh', 'equipamentos', 'veiculos', 'estoque', 'relatorios', 'usuarios'];
  
  // Retrieve all seeded cargos
  const stmtSelect = database.prepare("SELECT id, empresa_id, nome FROM cargos");
  const cargos: { id: string; empresa_id: string; nome: string }[] = [];
  while (stmtSelect.step()) {
    cargos.push(stmtSelect.getAsObject() as any);
  }
  stmtSelect.free();

  const stmtInsert = database.prepare(`
    INSERT OR REPLACE INTO cargos_permissoes 
    (id, empresa_id, cargo_id, modulo, visualizar, criar, editar, excluir, solicitar, aprovar, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `);

  for (const crg of cargos) {
    const nomeLower = crg.nome.toLowerCase();
    const isEncarregadoOrMaster = nomeLower.includes('encarregado') || nomeLower.includes('diretor') || nomeLower.includes('coordenador') || nomeLower.includes('gerente') || nomeLower.includes('engenheiro');
    const isAssistenteOrAuxiliar = nomeLower.includes('assistente') || nomeLower.includes('auxiliar') || nomeLower.includes('técnico');

    for (const mod of modulos) {
      const permId = `prm-${crg.id}-${mod}`;
      let visualizar = 1;
      let criar = 0;
      let editar = 0;
      let excluir = 0;
      let solicitar = 1;
      let aprovar = 0;

      if (isEncarregadoOrMaster) {
        visualizar = 1;
        criar = 1;
        editar = 1; // Can edit directly
        excluir = mod === 'efetivo' || mod === 'obras' ? 1 : 0;
        solicitar = 1;
        aprovar = 1; // Can approve requests from subordinates
      } else if (isAssistenteOrAuxiliar) {
        visualizar = 1;
        criar = mod === 'efetivo' || mod === 'documentos' ? 1 : 0;
        editar = 0; // Cannot edit directly -> must request change!
        excluir = 0;
        solicitar = 1; // Can submit change requests
        aprovar = 0; // Cannot approve
      } else {
        // Operacional / Default
        visualizar = 1;
        criar = 0;
        editar = 0;
        excluir = 0;
        solicitar = 1;
        aprovar = 0;
      }

      stmtInsert.run([permId, crg.empresa_id, crg.id, mod, visualizar, criar, editar, excluir, solicitar, aprovar]);
    }
  }
  stmtInsert.free();
}

function seedDefaultSolicitacoes(database: Database) {
  const initialSolicitacoes = [
    {
      id: 'sol-1024',
      codigo_sequencial: 1024,
      empresa_id: 'emp-001',
      modulo: 'efetivo',
      registro_id: 'adm-101',
      registro_identificador: 'Carlos Eduardo Silva',
      solicitante_id: 'usr-004',
      solicitante_nome: 'João Santos',
      solicitante_cargo: 'Assistente Administrativo',
      campo: 'Cargo / Função & Previsão',
      valor_atual: 'Função: Engenheiro Civil | Previsão: 01/09/2026',
      valor_solicitado: 'Função: Engenheiro Residente Pleno | Previsão: 15/09/2026',
      dados_anteriores: JSON.stringify({
        id: 'adm-101',
        nome: 'Carlos Eduardo Silva',
        funcao: 'Engenheiro Civil',
        obra_id: 'obra-001',
        previsao_contratacao: '2026-09-01'
      }),
      dados_solicitados: JSON.stringify({
        id: 'adm-101',
        nome: 'Carlos Eduardo Silva',
        funcao: 'Engenheiro Residente Pleno',
        obra_id: 'obra-001',
        previsao_contratacao: '2026-09-15'
      }),
      status: 'pendente',
      aprovador_id: null,
      aprovador_nome: null,
      aprovador_cargo: null,
      data_aprovacao: null,
      motivo_recusa: null,
      observacoes: 'Ajuste solicitado pelo setor de engenharia de campo devido à reestruturação do canteiro.',
      data_solicitacao: '2026-08-18 09:30:00'
    },
    {
      id: 'sol-1023',
      codigo_sequencial: 1023,
      empresa_id: 'emp-001',
      modulo: 'efetivo',
      registro_id: 'adm-102',
      registro_identificador: 'Mariana Costa Rodrigues',
      solicitante_id: 'usr-004',
      solicitante_nome: 'João Santos',
      solicitante_cargo: 'Assistente Administrativo',
      campo: 'Data ASO & Exame',
      valor_atual: 'Data ASO: 14/08/2026',
      valor_solicitado: 'Data ASO: 17/08/2026',
      dados_anteriores: JSON.stringify({
        id: 'adm-102',
        nome: 'Mariana Costa Rodrigues',
        data_aso: '2026-08-14'
      }),
      dados_solicitados: JSON.stringify({
        id: 'adm-102',
        nome: 'Mariana Costa Rodrigues',
        data_aso: '2026-08-17'
      }),
      status: 'aprovada',
      aprovador_id: 'usr-001',
      aprovador_nome: 'Carlos Ferreira',
      aprovador_cargo: 'Encarregado Geral',
      data_aprovacao: '2026-08-18 10:15:00',
      motivo_recusa: null,
      observacoes: 'Comprovante médico validado no prontuário de saúde ocupacional.',
      data_solicitacao: '2026-08-17 16:45:00'
    }
  ];

  const stmtSol = database.prepare(`
    INSERT INTO solicitacoes_alteracao 
    (id, codigo_sequencial, empresa_id, modulo, registro_id, registro_identificador, solicitante_id, solicitante_nome, solicitante_cargo, campo, valor_atual, valor_solicitado, dados_anteriores, dados_solicitados, status, aprovador_id, aprovador_nome, aprovador_cargo, data_aprovacao, motivo_recusa, observacoes, data_solicitacao, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  `);

  const stmtHist = database.prepare(`
    INSERT INTO solicitacoes_historico
    (id, solicitacao_id, tipo_evento, usuario_id, usuario_nome, usuario_cargo, detalhes, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const sol of initialSolicitacoes) {
    stmtSol.run([
      sol.id,
      sol.codigo_sequencial,
      sol.empresa_id,
      sol.modulo,
      sol.registro_id,
      sol.registro_identificador,
      sol.solicitante_id,
      sol.solicitante_nome,
      sol.solicitante_cargo,
      sol.campo,
      sol.valor_atual,
      sol.valor_solicitado,
      sol.dados_anteriores,
      sol.dados_solicitados,
      sol.status,
      sol.aprovador_id,
      sol.aprovador_nome,
      sol.aprovador_cargo,
      sol.data_aprovacao,
      sol.motivo_recusa,
      sol.observacoes,
      sol.data_solicitacao,
    ]);

    // Histórico de criação
    stmtHist.run([
      `hist-${sol.id}-1`,
      sol.id,
      'CRIADA',
      sol.solicitante_id,
      sol.solicitante_nome,
      sol.solicitante_cargo,
      `Solicitação de alteração submetida para aprovação: ${sol.campo}`,
      sol.data_solicitacao,
    ]);

    if (sol.status === 'aprovada') {
      stmtHist.run([
        `hist-${sol.id}-2`,
        sol.id,
        'APROVADA',
        sol.aprovador_id!,
        sol.aprovador_nome!,
        sol.aprovador_cargo!,
        'Alterações aprovadas e aplicadas ao cadastro oficial com sucesso.',
        sol.data_aprovacao!,
      ]);
    }
  }

  stmtSol.free();
  stmtHist.free();
}

/**
 * Executes a parameterized SQL SELECT query and returns array of objects
 */
export async function queryRows<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  const database = await getDb();
  const stmt = database.prepare(sql);
  stmt.bind(params);

  const results: T[] = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject() as T);
  }
  stmt.free();
  return results;
}

/**
 * Executes a parameterized SQL query that modifies data (INSERT, UPDATE, DELETE)
 */
export async function executeQuery(sql: string, params: any[] = []): Promise<void> {
  const database = await getDb();
  database.run(sql, params);
  saveDbToDisk();
}
