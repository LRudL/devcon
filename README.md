# devcon

## installation

1. First make sure you have brew:

```
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

2. Install node
```
brew install node
```

3. Go to the directory where you cloned the repo

4. run

```
npm install
```

5. Then, to develop, run:

```
npm run dev
```

(keep this open in the background so it will continue running and rebuild on file change, if you're developing)

6. Chrome --> three dots --> Extensions --> Manage Extensions --> toggle Developer mode on --> "load unpacked" --> select the `dist` folder within the main repo folder
