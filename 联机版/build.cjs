const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const stamp=new Date().toISOString().replace(/[:.]/g,'-'),out=path.join(__dirname,'交付','paper-racer-'+stamp);
fs.mkdirSync(path.join(out,'online'),{recursive:true});
for(const f of ['server.cjs','rooms.cjs','online.js','online.css','index.html','manage.html','manage.js','rematch-ui.js','admin-unavailable.html','continuous-online.js','preview.test.cjs','lobby.test.cjs','room-browser.js','room-browser.css','lobby-ui.js','test.cjs','README.md','部署交接.md','异步更新说明.md','paper-racer.service'])fs.copyFileSync(path.join(__dirname,f),path.join(out,'online',f));
for(const version of ['v1','v2'])fs.cpSync(path.join(__dirname,'..',version,'dist'),path.join(out,version,'dist'),{recursive:true});
const hashes={};function scan(dir){for(const f of fs.readdirSync(dir,{withFileTypes:true})){const file=path.join(dir,f.name);if(f.isDirectory())scan(file);else hashes[path.relative(out,file).split(path.sep).join('/')]=crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');}}scan(out);fs.writeFileSync(path.join(out,'SHA256.json'),JSON.stringify(hashes,null,2));console.log(out);


