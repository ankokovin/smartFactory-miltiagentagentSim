rm -fr ./docs 
mkdir ./docs 
rm -fr ./dist.browser
./node_modules/.bin/tsc -p tsconfig.browser.json
cp -r ./public/* ./docs
cp -r ./dist.browser ./docs/js/environment
cp -r ./lib ./docs/js/environment/

fix_file () {
    sed -i -E 's/(import .* from ).(.*)(.);/\1"\2.js";/' $1
}

fix_dir () {
    for f in $1
    do
        fix_file $f
    done
}

fix_dir "./docs/js/environment/*.js"
fix_dir "./docs/js/environment/agents/*.js"
fix_dir "./docs/js/environment/data/*.js"
fix_dir "./docs/js/environment/data/material/*.js"
fix_dir "./docs/js/environment/data/process/*.js"
fix_dir "./docs/js/environment/data/types/*.js"
fix_dir "./docs/js/environment/interfaces/*.js"
fix_dir "./docs/js/environment/query/*.js"

sed -i -E 's,import PriorityQueue from "typescript-collections/dist/lib/PriorityQueue.js";,import PriorityQueue from "./lib/typescript-collections/PriorityQueue.js",' "./docs/js/environment/Environment.js"
sed -i -E 's,import PriorityQueue from "typescript-collections/dist/lib/PriorityQueue.js";,import PriorityQueue from "../lib/typescript-collections/PriorityQueue.js",' "./docs/js/environment/agents/OrderPlanningQueue.js"