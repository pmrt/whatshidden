# UNSAFE UPDATE — THIS OVERWRITES THE CURRENT WORKING TREE

# copy the chats
cp -r chats ~/.whatshidden
# fetch the last stable branch, but do not merge
git fetch origin master
# set working tree to the last commit
git reset --hard origin/master
# install dependencies again
npm install
# get the chats back
cp -r ~/.whatshidden/chats .
# remove the temporary directory
rm -rf ~/.whatshidden