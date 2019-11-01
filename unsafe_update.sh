# UNSAFE UPDATE — THIS OVERWRITES THE CURRENT WORKING TREE

# fetch the last stable branch, but do not merge
git fetch origin master
# set working tree to the last commit
git reset --hard origin/master