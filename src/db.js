import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } from '../config.js';

// Service-role key bypasses RLS; both tables have RLS enabled with no public
// policies, so ownership must be enforced in the app layer (see requireOwner
// in server.js), not by Postgres.
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

function mapUserRow(row) {
  return { id: row.id, nickname: row.nickname, createdAt: row.created_at };
}

function mapRecipeRow(row) {
  return {
    id: row.id,
    name: row.name,
    usedIngredients: row.used_ingredients,
    missingIngredients: row.missing_ingredients,
    steps: row.steps,
    estimatedTimeMinutes: row.estimated_time_minutes,
    savedAt: row.saved_at,
  };
}

export async function createUser(id, nickname) {
  const { data, error } = await supabase
    .from('fridge_user_tbl')
    .insert({ id, nickname })
    .select('id, nickname, created_at')
    .single();
  if (error) throw error;
  return mapUserRow(data);
}

export async function getUser(id) {
  const { data, error } = await supabase
    .from('fridge_user_tbl')
    .select('id, nickname, created_at')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data ? mapUserRow(data) : null;
}

export async function saveRecipe(id, userId, recipe) {
  const { data, error } = await supabase
    .from('fridge_recipes_tbl')
    .insert({
      id,
      user_id: userId,
      name: recipe.name,
      used_ingredients: recipe.usedIngredients ?? [],
      missing_ingredients: recipe.missingIngredients ?? [],
      steps: recipe.steps ?? [],
      estimated_time_minutes: recipe.estimatedTimeMinutes ?? null,
    })
    .select('id, saved_at')
    .single();
  if (error) throw error;
  return { id: data.id, savedAt: data.saved_at };
}

export async function listRecipes(userId) {
  const { data, error } = await supabase
    .from('fridge_recipes_tbl')
    .select('*')
    .eq('user_id', userId)
    .order('saved_at', { ascending: false });
  if (error) throw error;
  return data.map(mapRecipeRow);
}

export async function getRecipeOwner(id) {
  const { data, error } = await supabase
    .from('fridge_recipes_tbl')
    .select('user_id')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data?.user_id ?? null;
}

export async function deleteRecipe(id) {
  const { error } = await supabase.from('fridge_recipes_tbl').delete().eq('id', id);
  if (error) throw error;
}
