import mysql from 'mysql2/promise';

const connection = await mysql.createConnection({
  host: process.env.DATABASE_URL?.split('@')[1]?.split(':')[0] || 'localhost',
  user: process.env.DATABASE_URL?.split('//')[1]?.split(':')[0] || 'root',
  password: process.env.DATABASE_URL?.split(':')[2]?.split('@')[0] || '',
  database: process.env.DATABASE_URL?.split('/').pop()?.split('?')[0] || 'irpf',
});

try {
  // Atualizar percentualDiversos para 10
  const [result] = await connection.execute(
    'UPDATE settings SET percentualDiversos = 10 WHERE userId = 1'
  );
  console.log('✅ percentualDiversos atualizado para 10');
  console.log('Linhas afetadas:', result.affectedRows);

  // Verificar o valor
  const [rows] = await connection.execute(
    'SELECT percentualDiversos, valorFixoSocio FROM settings WHERE userId = 1'
  );
  console.log('Configurações atuais:', rows[0]);
} catch (error) {
  console.error('❌ Erro:', error.message);
} finally {
  await connection.end();
}
