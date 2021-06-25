rm -fr ./publish 
mkdir ./publish 
rm -fr ./dist.browser
./node_modules/.bin/tsc -p tsconfig.browser.json
cp -r ./public/* ./publish
cp -r ./dist.browser ./publish/js/environment

fix_file () {
    sed -i -E 's/(import .* from ).(.*)(.);/\1"\2.js";/' $1
}

fix_dir () {
    for f in $1
    do
        fix_file $f
    done
}

fix_dir "./publish/js/environment/*.js"
fix_dir "./publish/js/environment/agents/*.js"
fix_dir "./publish/js/environment/data/*.js"
fix_dir "./publish/js/environment/data/material/*.js"
fix_dir "./publish/js/environment/data/process/*.js"
fix_dir "./publish/js/environment/data/types/*.js"
fix_dir "./publish/js/environment/interfaces/*.js"