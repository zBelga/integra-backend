/**
 * Testes das regras de acesso a documentos (isolamento + matriz de permissões).
 * Roda com um banco SQLite temporário: `npx tsx backend/tests/documentosAcesso.test.ts`
 */
import { getDb, executeQuery } from '../db.js';
import { permissoesDocumentos, mesmaEmpresa, pode } from '../utils/documentosAcesso.js';

let falhas = 0;
function confere(nome: string, obtido: unknown, esperado: unknown) {
  const ok = JSON.stringify(obtido) === JSON.stringify(esperado);
  if (!ok) falhas++;
  console.log(`${ok ? '✓' : '✗'} ${nome}${ok ? '' : `  → obtido ${JSON.stringify(obtido)}, esperado ${JSON.stringify(esperado)}`}`);
}
const req = (user: any) => ({ user } as any);

async function main() {
  await getDb();
  await executeQuery(`INSERT OR IGNORE INTO empresas (id, nome, cnpj) VALUES ('emp-A','A','11.111.111/0001-11'),('emp-B','B','22.222.222/0001-22')`);
  await executeQuery(`INSERT OR IGNORE INTO cargos (id, empresa_id, nome) VALUES ('car-enc','emp-A','Encarregado'),('car-aux','emp-A','Auxiliar')`);
  await executeQuery(`INSERT OR IGNORE INTO usuarios (id, nome, email, cargo_id, cargo, perfil, empresa_id) VALUES
    ('u-enc','Enc','enc@a.com','car-enc','Encarregado','operacional','emp-A'),
    ('u-aux','Aux','aux@a.com','car-aux','Auxiliar','operacional','emp-A'),
    ('u-sem','Sem','sem@a.com','','Sem cargo','operacional','emp-A')`);
  // Encarregado: pode anexar e substituir, não pode excluir
  await executeQuery(`INSERT OR REPLACE INTO cargos_permissoes (id, empresa_id, cargo_id, modulo, visualizar, criar, editar, excluir)
    VALUES ('p1','emp-A','car-enc','documentos',1,1,1,0)`);

  const master = req({ id: 'm', perfil: 'master_admin', empresa_id: 'emp-A' });
  const gestor = req({ id: 'g', perfil: 'gestor_rh', empresa_id: 'emp-A' });
  const enc = req({ id: 'u-enc', perfil: 'operacional', empresa_id: 'emp-A' });
  const aux = req({ id: 'u-aux', perfil: 'operacional', empresa_id: 'emp-A' });
  const sem = req({ id: 'u-sem', perfil: 'operacional', empresa_id: 'emp-A' });
  const anon = req(undefined);

  console.log('\n— Isolamento entre empresas');
  confere('usuário da A vê registro da A', mesmaEmpresa(enc, 'emp-A'), true);
  confere('usuário da A NÃO vê registro da B', mesmaEmpresa(enc, 'emp-B'), false);
  confere('gestor da A NÃO vê registro da B', mesmaEmpresa(gestor, 'emp-B'), false);
  confere('master alterna entre empresas', mesmaEmpresa(master, 'emp-B'), true);
  confere('sem login não vê nada', mesmaEmpresa(anon, 'emp-A'), false);
  confere('registro sem empresa não vaza', mesmaEmpresa(enc, ''), false);

  console.log('\n— Permissões (matriz por cargo, módulo documentos)');
  confere('gestor de RH: tudo', await permissoesDocumentos(gestor), { visualizar: true, criar: true, editar: true, excluir: true });
  confere('encarregado: conforme a matriz', await permissoesDocumentos(enc), { visualizar: true, criar: true, editar: true, excluir: false });
  confere('auxiliar sem linha na matriz: só ver', await permissoesDocumentos(aux), { visualizar: true, criar: false, editar: false, excluir: false });
  confere('usuário sem cargo: só ver', await permissoesDocumentos(sem), { visualizar: true, criar: false, editar: false, excluir: false });
  confere('encarregado não exclui', await pode(enc, 'excluir'), false);
  confere('auxiliar não anexa', await pode(aux, 'criar'), false);

  console.log(`\n${falhas === 0 ? 'TODOS OS TESTES PASSARAM' : `${falhas} FALHA(S)`}`);
  process.exit(falhas ? 1 : 0);
}
main().catch(e => { console.error(e); process.exit(1); });
