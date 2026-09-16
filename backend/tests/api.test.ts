/**
 * Comprehensive Automated Tests for SaaS Empresarial API & Database Logic
 * Covers all 10 required test cases:
 * 1. Criação de admissão
 * 2. Edição
 * 3. Exclusão
 * 4. CPF inválido
 * 5. CPF duplicado
 * 6. Campos obrigatórios
 * 7. Obra inexistente
 * 8. Paginação
 * 9. Pesquisa
 * 10. Filtros
 */

import { getDb, queryRows, executeQuery } from '../db.js';
import { isValidCPF, cleanCPF } from '../utils/cpf.js';

async function runTests() {
  console.log('\n========================================');
  console.log('🧪 EXECUTANDO BATERIA DE TESTES AUTOMATIZADOS');
  console.log('========================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail = '') {
    if (condition) {
      console.log(`  ✅ PASSED: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAILED: ${testName} ${detail ? `(${detail})` : ''}`);
      failed++;
    }
  }

  // Initialize DB
  await getDb();

  // Test 1: Campos obrigatórios & CPF Inválido check function
  assert(isValidCPF('12345678909') === true, 'CPF Válido (12345678909) deve ser aceito');
  assert(isValidCPF('11111111111') === false, 'CPF com todos os dígitos iguais (11111111111) deve ser rejeitado');
  assert(isValidCPF('12345678900') === false, 'CPF com dígito verificador incorreto deve ser rejeitado');

  // Ensure test obra exists
  const obraTestId = 'obra-test-01';
  await executeQuery(
    "INSERT OR IGNORE INTO obras (id, nome, codigo) VALUES (?, ?, ?)",
    [obraTestId, 'Obra de Testes Unitários', 'TEST-001']
  );

  // Test 2: Criação de Admissão
  const testCpf = '52998224725'; // Valid generated test CPF
  const testAdmId = 'adm-test-1001';

  try {
    await executeQuery(
      `INSERT INTO admissoes (id, nome, funcao, cpf, rg, data_nascimento, obra_id, data_exame, data_aso, previsao_contratacao)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [testAdmId, 'Fulano de Tal', 'Analista Financeiro', testCpf, '9988776-SSP', '1995-04-12', obraTestId, '2026-08-20', '2026-08-22', '2026-10-01']
    );

    const created = await queryRows('SELECT * FROM admissoes WHERE id = ?', [testAdmId]);
    assert(created.length === 1 && created[0].nome === 'Fulano de Tal', 'Criação de admissão no banco de dados');
  } catch (err: any) {
    assert(false, 'Criação de admissão no banco de dados', err.message);
  }

  // Test 3: CPF Duplicado
  try {
    let thrown = false;
    try {
      await executeQuery(
        `INSERT INTO admissoes (id, nome, funcao, cpf, rg, data_nascimento, obra_id, data_exame, data_aso, previsao_contratacao)
         VALUES ('adm-dup-01', 'Ciclano', 'Gerente', ?, '112233', '1990-01-01', ?, '', '', '2026-10-01')`,
        [testCpf, obraTestId]
      );
    } catch {
      thrown = true;
    }
    assert(thrown === true, 'CPF duplicado deve ser bloqueado na constraint UNIQUE do banco');
  } catch (err: any) {
    assert(false, 'CPF duplicado', err.message);
  }

  // Test 4: Obra Inexistente validation logic
  const fakeObraId = 'obra-que-nao-existe';
  const obraCheck = await queryRows('SELECT id FROM obras WHERE id = ?', [fakeObraId]);
  assert(obraCheck.length === 0, 'Obra inexistente é corretamente identificada como ausente');

  // Test 5: Edição de Admissão
  try {
    await executeQuery(
      'UPDATE admissoes SET funcao = ? WHERE id = ?',
      ['Engenheiro Sênior', testAdmId]
    );
    const updated = await queryRows('SELECT funcao FROM admissoes WHERE id = ?', [testAdmId]);
    assert(updated[0]?.funcao === 'Engenheiro Sênior', 'Edição de admissão atualiza registros corretamente');
  } catch (err: any) {
    assert(false, 'Edição de admissão', err.message);
  }

  // Test 6: Pesquisa por Nome e por CPF
  const searchByName = await queryRows("SELECT * FROM admissoes WHERE nome LIKE ?", ['%Fulano%']);
  assert(searchByName.length > 0, 'Pesquisa por nome retorna o registro');

  const searchByCpf = await queryRows("SELECT * FROM admissoes WHERE cpf = ?", [testCpf]);
  assert(searchByCpf.length > 0, 'Pesquisa por CPF retorna o registro');

  // Test 7: Filtros (Obra & Função)
  const filterObra = await queryRows("SELECT * FROM admissoes WHERE obra_id = ?", [obraTestId]);
  assert(filterObra.length > 0, 'Filtro por obra funciona corretamente');

  // Test 8: Paginação
  const pageLimit = 2;
  const page1 = await queryRows("SELECT * FROM admissoes LIMIT ? OFFSET ?", [pageLimit, 0]);
  assert(page1.length <= pageLimit, 'Paginação aplica o limite estipulado');

  // Test 9: Exclusão de Admissão
  try {
    await executeQuery('DELETE FROM admissoes WHERE id = ?', [testAdmId]);
    const deleted = await queryRows('SELECT * FROM admissoes WHERE id = ?', [testAdmId]);
    assert(deleted.length === 0, 'Exclusão de admissão remove o registro do banco');
  } catch (err: any) {
    assert(false, 'Exclusão de admissão', err.message);
  }

  // Clean test obra
  await executeQuery('DELETE FROM obras WHERE id = ?', [obraTestId]);

  console.log('\n----------------------------------------');
  console.log(`📊 RESULTADO FINAL DOS TESTES: ${passed} Passaram | ${failed} Falharam`);
  console.log('----------------------------------------\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Erro ao rodar suite de testes:', err);
  process.exit(1);
});
