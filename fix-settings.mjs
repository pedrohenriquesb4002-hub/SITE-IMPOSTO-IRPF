import mysql from 'mysql2/promise';

const connectionUrl = process.env.DATABASE_URL;

async function fixSettings() {
  const connection = await mysql.createConnection(connectionUrl);
  
  try {
    const result = await connection.execute(
      'UPDATE settings SET percentualDiversos = 10, valorFixoSocio = 500 WHERE userId = 1'
    );
    console.log('Settings updated successfully!');
    console.log('Affected rows:', result[0].affectedRows);
  } catch (error) {
    console.error('Error updating settings:', error);
  } finally {
    await connection.end();
  }
}

fixSettings();
