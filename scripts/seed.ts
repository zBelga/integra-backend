/**
 * seed.ts — Cria o usuário master se ainda não existir no banco.
 * Execute com: npm run seed
 */

import { getDb, queryRows, executeQuery } from '../backend/db.js';

const MASTER = {
  id:         'usr-master-001',
  nome:       'Fabrício Oliveira',
  email:      'fabriciooliveira2431@gmail.com',
  senha:      'Admin@2026',          // troque após o primeiro login
  cargo:      'Administrador Geral',
  perfil:     'master_admin',
  empresa_id: '',
  status:     'ativo',
};

async function seed() {
  console.log('🌱 Iniciando seed do banco de dados...\n');
  await getDb();

  // Verificar se já existe
  const existing = await queryRows('SELECT id, email FROM usuarios WHERE LOWER(email) = ?', [MASTER.email]);

  if (existing.length > 0) {
    console.log(`✅ Usuário master já existe: ${existing[0].email}`);
    console.log('   Nenhuma alteração foi feita.\n');

    // Mostrar todos os usuários existentes
    const all = await queryRows('SELECT id, nome, email, perfil, status FROM usuarios', []);
    console.log(`📋 Usuários no banco (${all.length} total):`);
    all.forEach((u: any) => {
      console.log(`   [${u.status}] ${u.nome} — ${u.email} — ${u.perfil}`);
    });
    return;
  }

  await executeQuery(
    `INSERT INTO usuarios
       (id, nome, email, senha, cargo, perfil, empresa_id, status, telefone, departamento, permissoes, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, '', '', '[]', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
    [
      MASTER.id,
      MASTER.nome,
      MASTER.email,
      MASTER.senha,
      MASTER.cargo,
      MASTER.perfil,
      MASTER.empresa_id,
      MASTER.status,
    ]
  );

  console.log('✅ Usuário master criado com sucesso!\n');
  console.log('   📧 Email :', MASTER.email);
  console.log('   🔑 Senha :', MASTER.senha);
  console.log('\n⚠️  Troque a senha após o primeiro login!\n');
}

seed().catch((err) => {
  console.error('❌ Erro ao executar seed:', err);
  process.exit(1);
});
