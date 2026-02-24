// rename-showroom-logos.js
import { createClient } from '@supabase/supabase-js'

// 1️⃣ Replace with your Supabase info
const SUPABASE_URL = 'https://niruykateyjautqjnfzx.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5pcnV5a2F0ZXlqYXV0cWpuZnp4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTgzNzkyMSwiZXhwIjoyMDg3NDEzOTIxfQ.0FC2nsxHNqvFPy4sZHhF2BC4j7ZXjbUA4mW6SzOg42E' // MUST be a service_role key
const BUCKET = 'showroom-logos'

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

async function renameObjects() {
  // 2️⃣ List all objects in the bucket
  const { data: objects, error: listError } = await supabase.storage.from(BUCKET).list('', { recursive: true })
  if (listError) return console.error('Failed to list objects:', listError)

  console.log(`Found ${objects.length} objects.`)

  for (const obj of objects) {
    // 3️⃣ Skip if name already looks correct
    if (!obj.name.includes('/')) continue

    // 4️⃣ Extract only the filename before the first slash
    const parts = obj.name.split('/')
    const newName = parts[0] // keeps showroom-xxxxxx.png

    // 5️⃣ Copy to new name
    const { data: copyData, error: copyError } = await supabase.storage.from(BUCKET).move(obj.name, newName)
    if (copyError) {
      console.error(`Failed to rename "${obj.name}" -> "${newName}":`, copyError)
    } else {
      console.log(`Renamed: "${obj.name}" -> "${newName}"`)
    }
  }

  console.log('✅ All objects processed.')
}

renameObjects()