// lib/ultimoPreco.js
// Equivalente a _ultimoPrecoItem() do Apps Script.

const { getDb } = require('./db');

async function ultimoPrecoItem(nomeItem) {
  const db = getDb();
  const { data, error } = await db
    .from('registros')
    .select('preco')
    .ilike('item', nomeItem)
    .gt('preco', 0)
    .order('id', { ascending: false })
    .limit(1);
  if (error) throw error;
  return data && data.length ? parseFloat(data[0].preco) || 0 : 0;
}

module.exports = { ultimoPrecoItem };
