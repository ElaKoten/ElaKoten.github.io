# Ela Köten\|24040004028

# Design Rationale: Decay

## Idea

When the user clicks on the canvas, or presses keys A-K, soundwaves will appear which   
adding new soundwave notes sequentially in a continuous timeline. Each input generates a synth tone (keys A–D) or deep bass (keys F–K), turning user actions into a continuous visual and acoustic composition that continuously evolves and fades.

## Premise A and B

This experience has temporality and feedback.Temporality controls the system through time: every generated soundwave node continuously loses its life value, making the active waveforms to fade and erase themselves over time rather than staying all the time.. Feedback connects how long a note stays visible to how blurry it looks; as notes age, they diffuse into soft, smudged chronological trails. Together, they create a strong dependency: the visual smudging acts as spatial feedback that directly communicates the exact temporal age of each sound impulse.

## Theory

Hattie and Timperley’s (2007) idea of progressive feedback was used to show note decay as a smooth fade instead of an abrupt change. By making the blur grow as notes get older, the screen shows how time passes. A limitation here is that heavy blur hides older notes, creating visual mystery rather than exact data tracking.

Jota et al. 's (2013) research on response time was used for triggering the sound and visuals, the second of a key press. Providing immediate system feedback keeps the connection clear between user actions and screen waves. A counterpoint is that while instant feedback feels direct, the slow blurring trail shifts focus from instant control to watching long term system memory.

## What I learned

## During early testing, I observed that clearing the canvas completely on each frame wiped away soundwaves too fast, making it impossible to see past actions. By separating each notes time decay queue with progressive Gaussian blurring, the system kept the smudged historical trails, making the passage of time legibly visible.

### 

### Live Link

GitHub Page: [https\://elakoten.github.io/decay/](https://elakoten.github.io/decay/)

### References

* Hattie, J., & Timperley, H. (2007). The power of feedback. *Review of Educational Research*, 77(1), 81–112. [https\://doi.org/10.3102/003465430298487](https://doi.org/10.3102/003465430298487)

* Jota, R., Ng, A., Dietz, P., & Wigdor, D. (2013). How fast is fast enough? A study of the effects of latency in direct-touch pointing tasks. *Proceedings of the SIGCHI Conference on Human Factors in Computing Systems*, 2291–2300. [https\://doi.org/10.1145/2470654.2481317](https://doi.org/10.1145/2470654.2481317)  
