// lib/db.js
// Substitui o "SpreadsheetApp" do Google Apps Script pelo Supabase.

const { createClient } = require('@supabase/supabase-js');

let _client = null;

function getDb() {
  if (_client) return _client;

  const url = process.env.SUPABASE_URL;
  // Use a service_role key (não a anon) porque as funções aqui rodam no
  // servidor e precisam ler/escrever sem as restrições de RLS do cliente.
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      'Variáveis de ambiente ausentes: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.'
    );
  }

  _client = createClient(url, key, { auth: { persistSession: false } });
  return _client;
}

module.exports = { getDb };

