import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, serviceKey)

const bucketName = 'showroom-logos' // change if different
const localFolder = './storage_backup/showroom-logos'

async function uploadFolder(folderPath, folderName = '') {
  const files = fs.readdirSync(folderPath)

  for (const file of files) {
    const fullPath = path.join(folderPath, file)
    const stat = fs.statSync(fullPath)

    if (stat.isDirectory()) {
      await uploadFolder(fullPath, path.join(folderName, file))
    } else {
      const fileBuffer = fs.readFileSync(fullPath)

      const { error } = await supabase.storage
        .from(bucketName)
        .upload(path.join(folderName, file), fileBuffer, {
          upsert: true,
        })

      if (error) {
        console.error('Upload failed:', file, error.message)
      } else {
        console.log('Uploaded:', file)
      }
    }
  }
}

uploadFolder(localFolder)