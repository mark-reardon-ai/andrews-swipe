import Ajv2020 from 'ajv/dist/2020.js'; import addFormats from 'ajv-formats'; import fs from 'fs'
const ajv=new Ajv2020({strict:false}); addFormats(ajv)
ajv.addSchema(JSON.parse(fs.readFileSync('schema/common.schema.json')))
const v=ajv.compile(JSON.parse(fs.readFileSync('schema/swipe_card.schema.json')))
const d=JSON.parse(fs.readFileSync(process.argv[2])); console.log(v(d)?'VALID':v.errors)
for (const c of d.cards) for (const f of [c.image.file,c.image.file_b,...Object.values(c.image.x_webp||{}),...Object.values(c.image.x_webp_b||{})].filter(Boolean)) if(!fs.existsSync('public/decks/R01-sample/'+f)) console.log('MISSING',f)
