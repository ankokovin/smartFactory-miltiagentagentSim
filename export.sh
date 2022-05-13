rm -fr ./dist/source_server.txt
print_source() {
    echo -en "\n//Code: $1\n" >> ./dist/source_server.txt
    cat $1 >> ./dist/source_server.txt
}

for f in $(find ./src -name '*.ts');
do
    print_source $f
done

rm -fr ./dist/source_front.txt
print_source_2() {
    echo -en "\n//$1\n" >> ./dist/source_front.txt
    cat $1 >> ./dist/source_front.txt
}

print_source_2 ./public/js/index.js
print_source_2 ./public/index.html
print_source_2 ./public/css/index.css