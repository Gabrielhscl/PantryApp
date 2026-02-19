import { db } from "../database/db";
import {
  products,
  inventoryItems,
  shoppingListItems,
} from "../database/schema"; // Importe todas as suas tabelas
import { supabase } from "../lib/supabase";
import { eq, gt } from "drizzle-orm";

// Mapeamento das tabelas locais para as tabelas do Supabase
// Nota: Você precisa criar essas tabelas no Supabase com os mesmos nomes e colunas!
const TABLES_TO_SYNC = [
  { name: "products", schema: products },
  { name: "inventory_items", schema: inventoryItems },
  { name: "shopping_list_items", schema: shoppingListItems },
  // Adicione recipes e templates aqui depois
];

export const SyncService = {
  async syncAll(userId: string) {
    console.log("🔄 Iniciando Sincronização...");
    let changesCount = 0;

    for (const table of TABLES_TO_SYNC) {
      try {
        // 1. PUSH: Enviar dados locais não sincronizados para a nuvem
        // Precisamos selecionar onde isSynced é false (0)
        // Nota: O Drizzle sqlite usa 0/1 para booleans
        const unsyncedRows = await db
          .select()
          .from(table.schema)
          .where(eq(table.schema.isSynced, false))
          .all();

        if (unsyncedRows.length > 0) {
          console.log(
            `📤 Enviando ${unsyncedRows.length} itens de ${table.name}...`,
          );

          // Prepara os dados (remove campos locais se necessário e adiciona user_id)
          const rowsToUpload = unsyncedRows.map((row) => {
            const { isSynced, ...data } = row; // Remove isSynced antes de enviar
            return {
              ...data,
              user_id: userId,
              updated_at: new Date().toISOString(),
            };
          });

          // Upsert no Supabase (Insere ou Atualiza)
          const { error } = await supabase
            .from(table.name)
            .upsert(rowsToUpload);

          if (error) throw error;

          // Marca como sincronizado localmente
          for (const row of unsyncedRows) {
            await db
              .update(table.schema)
              .set({ isSynced: true })
              .where(eq(table.schema.id, row.id));
          }
          changesCount += unsyncedRows.length;
        }

        // 2. PULL: Baixar dados da nuvem (Simplificado: Pega tudo por enquanto)
        // Numa versão pro, usaríamos "last_pulled_at" para pegar só o delta
        const { data: remoteRows, error: fetchError } = await supabase
          .from(table.name)
          .select("*")
          .eq("user_id", userId);

        if (fetchError) throw fetchError;

        if (remoteRows && remoteRows.length > 0) {
          // Aqui você faria o UPSERT no SQLite
          // Como o SQLite do Expo não tem upsert nativo fácil em massa no Drizzle ainda,
          // iteramos (pode ser otimizado)
          for (const remoteRow of remoteRows) {
            // Adaptação dos dados remotos para o schema local
            const localData = {
              ...remoteRow,
              isSynced: true, // Já veio da nuvem, então está sync
              // Converta strings de data de volta para Date objects se necessário
              createdAt: new Date(remoteRow.created_at),
              updatedAt: new Date(remoteRow.updated_at),
              expiryDate: remoteRow.expiry_date
                ? new Date(remoteRow.expiry_date)
                : null,
            };

            // Tenta inserir, se falhar (já existe), atualiza
            // Drizzle tem .onConflictDoUpdate() para SQLite
            await db.insert(table.schema).values(localData).onConflictDoUpdate({
              target: table.schema.id,
              set: localData,
            });
          }
        }
      } catch (error) {
        console.error(`❌ Erro ao sincronizar ${table.name}:`, error);
        throw error;
      }
    }
    console.log("✅ Sincronização Concluída!");
    return changesCount;
  },
};
