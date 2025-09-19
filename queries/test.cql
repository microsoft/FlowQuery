// 1. Get 10 cat facts and collect them into a list
unwind range(0,10) as i
load json from "https://catfact.ninja/fact" as fact

// Return the cat facts
return fact.fact, fact.length