---
title: Shaking up the IDE
---

Recently at Digital Asset we open sourced our programming language [DAML](https://daml.com/), but I'm not going to talk about that today. Nestled inside this compiler is the [Haskell IDE Core](https://github.com/digital-asset/daml/tree/master/compiler/haskell-ide-core).

You might ask, what a Haskell IDE is doing inside of DAML. DAML is built on a tweaked version of the GHC API. Rather than writing our own parser, type checker ect we piggyback off the fine work done for GHC. The differences between DAML and Haskell are generally found in tweaks to parse trees, custom backends and interesting ways of interpreting the compiler output. These steps are written in various languages and take a non trivial amount of time to run.

The best way of wrangling long running computations written in different languages is to use a build system. Build systems are normally optimized for batch jobs, but with some tweaks [Shake](https://shakebuild.com/) can be made to run in real time.

So what does a build rule look like in IDE Engine? It's just a shake rule, except instead of indexing by file type we index using types + filepaths. Here's how you parse a file.

```haskell
getParsedModuleRule :: Rules ()
getParsedModuleRule =
    define $ \GetParsedModule file -> do
        contents <- use_ GetFileContents file
        packageState <- use_ GhcSession ""
        opt <- getOpts
        liftIO $ parseModule opt packageState file contents
```
The LSP bindings populate the buffer contents into the shake graph and if your rules depend directly or transitively on them they will be rerun on the buffer change. `define` creates a rule and `use_` or `uses_` either runs the rule or pulls a pre-computed value from the cache. `parseModule` is a pure(ish) function which does the heavy lifting of parsing the text.


```haskell
typeCheckRule :: Rules ()
typeCheckRule =
    define $ \TypeCheck file -> do
        pm <- use_ GetParsedModule file
        deps <- use_ GetDependencies file
        tms <- uses_ TypeCheck deps
        setPriority PriorityTypeCheck
        liftIO $ typecheckModule pm tms
```

There's a little hand waving in these examples, but it shows how you can pull the information you need out of shake and build a dependency graph with minimal work.

Shake takes care of all the heavy lifting such as caching/garbage collection. Each rule outputs a tuple of the `RuleResult` and `FileDiagnostics`. `FileDiagnostics` are a [Language Server Protocol (LSP)](https://langserver.org/) data construct, put simply it generates the squiggly lines and messages indicating errors, hints or warnings in your code. Shake sends and invalidates these results when appropriate.

```haskell
type instance RuleResult GetParsedModule = ParsedModule
type instance RuleResult TypeCheck = TcModuleResult
```
Once you've written your rules wire them together in your mainRule then run that rule in shake.

```haskell
mainRule :: Rules ()
mainRule = do
    getParsedModuleRule
    getLocatedImportsRule
    getDependencyInformationRule
    reportImportCyclesRule
    getDependenciesRule
    typeCheckRule
    getSpanInfoRule
    generateCoreRule
    loadGhcSession
    getHieFileRule
```

IDE Core allows a far more à la carte approach to putting together your IDE. You only have to add the rules that make sense for your setup and the low barrier to entry will hopefully foster an ecosystem of rules for the multitude of haskell setups.

It's not ready for primetime at the moment, currently it's a little light on IDE features and can only get dependencies with a specially crafted .ghci file. I'm running a project with Neil Mitchell at Zurihac this weekend for anyone who feels like getting involved and contributing some IDE rules. 

---
[Opinions are my own and not the views of my employer]{.weak}

[David Millar-Durrant - 12 Jun 2019]{.weak}
