---
title: Shaking up the IDE
---

Recently at Digital Asset we open sourced our programming language [DAML](https://daml.com/), but I'm not going to talk about that today. Nestled inside this compiler is the [Haskell IDE Core](https://github.com/digital-asset/daml/tree/master/compiler/haskell-ide-core).

It's reasonable to ask what a Haskell IDE is doing inside of DAML. DAML is built on a tweaked version of the GHC API. Rather than writing our own parser, type checker ect we instead piggyback off the fine work done for GHC. The differences between DAML and Haskell are generally found in tweaks to parse trees, custom backends and interesting ways of interpreting the compiler output. These steps are written in various languages and can sometimes take quite a long time to run. 

We largely preserve API compatibility with out GHC fork so any Haskell IDE is also a DAML IDE.

When you have a number of interdependent, long running build steps written in different languages the reasonable first instinct is to reach for a build system. Build systems are normally optimized for batch jobs, but with some tweaks shake can be made to run in real time.

So what does a build rule look like in IDE Engine, well it's pretty much a shake rule except instead of files we use types + files.
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
`define` creates a rule and `use_` or `uses_` either runs the rule or pulls a pre-computed value from the cache. `typecheckModule` is a pure(ish) function which gives you a type checked module from a parsed module and it's type checked dependencies. 

```haskell
data TypeCheck = TypeCheck
    deriving (Eq, Show, Typeable, Generic)
instance Hashable TypeCheck
instance NFData   TypeCheck

type instance RuleResult TypeCheck = TcModuleResult
```
The rule is indexed by the type and file. Shake takes care of all the heavy lifting such as caching/garbage collection and scheduling. You just have to write the rules and not worry about it. Each rule outputs a tuple of the RuleResult and FileDiagnostics.
