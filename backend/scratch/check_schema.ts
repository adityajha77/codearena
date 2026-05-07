import { createClient } from '@supabase/supabase-client'
import dotenv from 'dotenv'
dotenv.config()

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkSchema() {
  const { data, error } = await supabase.from('playground_participants').select('*').limit(1)
  if (error) {
    console.error(error)
  } else {
    console.log('Columns:', Object.keys(data[0] || {}))
  }
}

checkSchema()
