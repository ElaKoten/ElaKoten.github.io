console.log("Script.js loaded and executing!"); // DEBUG: Confirm script loading

document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM Content Loaded event fired!"); // DEBUG: Confirm DOM ready

    // --- Get references to HTML elements ---
    const currentQuestionText = document.getElementById('currentQuestionText');
    const questionButtons = document.getElementById('question-buttons');
    const yesBtn = document.getElementById('yesBtn');
    const noBtn = document.getElementById('noBtn');
    const resetBtn = document.getElementById('resetBtn');
    const recommendationOutput = document.getElementById('recommendationOutput');
    const songTitle = document.getElementById('songTitle');
    const songArtist = document.getElementById('songArtist');
    const messageOutput = document.getElementById('messageOutput');
    const messageText = document.getElementById('messageText');
    // Removed: const darkModeToggle = document.getElementById('darkModeToggle');
    // Removed: const darkModeIcon = document.getElementById('darkModeIcon');

    // --- Song Data (Your defined outcomes/mappings) ---
    // M = "Must Have Done Something Right" by Relient K (Happy default)
    // T = "Transatlanticism" by Death Cab for Cutie (Focused)
    // N = "Next 2 You" by Buckcherry (Energetic)
    // D_song = "Demolisher" by Slaughter to Prevail (Angry)
    // P = "Planet Caravan" by Black Sabbath (Drifting in emptiness)
    const SONGS = {
        M: { title: "Must Have Done Something Right", artist: "Relient K" },
        T: { title: "Transatlanticism", artist: "Death Cab for Cutie" },
        N: { title: "Next 2 You", artist: "Buckcherry" },
        D_song: { title: "Demolisher", artist: "Slaughter to Prevail" },
        P: { title: "Planet Caravan", artist: "Black Sabbath" },
        NO_REC: { title: "No specific song recommendation could be found.", artist: "Please try selecting a different path." }
    };

    // --- Mood Question Data and Flow Control ---
    const MOOD_QUESTIONS_DATA = {
        happy: { text: "Are you feeling Happy?", song: SONGS.M }, // Song M is the default for happy branch if no sub-mood
        energetic: { text: "Are you feeling Energetic?", song: SONGS.N },
        focused: { text: "Are you feeling Focused?", song: SONGS.T },
        angry: { text: "Are you feeling Angry?", song: SONGS.D_song },
        drifting: { text: "Are you feeling Drifting in Emptiness?", song: SONGS.P }
    };

    let currentBranchQuestions = []; // Will hold the array of question objects for the current branch
    let currentBranchIndex = 0; // Index within currentBranchQuestions
    let isHappyMainChoice = null; // Stores true if user said 'Yes' to happy, false if 'No'

    // --- Dark Mode Logic Removed ---
    // Removed: Check local storage for theme preference on load
    // Removed: Toggle dark mode on button click

    // --- Event Listeners for Mood Questions ---
    yesBtn.addEventListener('click', () => {
        handleAnswer(true);
    });

    noBtn.addEventListener('click', () => {
        handleAnswer(false);
    });

    resetBtn.addEventListener('click', () => {
        console.log("Reset button clicked!");
        resetAppToInitialState();
    });

    // --- Function to handle Yes/No answers and advance questions ---
    function handleAnswer(isYes) {
        hideAllOutputs(); // Clear previous outputs

        if (isHappyMainChoice === null) { // This is the very first 'happy' question being answered
            if (isYes) {
                isHappyMainChoice = true; // User said YES to Happy
                currentBranchQuestions = [
                    MOOD_QUESTIONS_DATA.energetic,
                    MOOD_QUESTIONS_DATA.focused
                ];
            } else {
                isHappyMainChoice = false; // User said NO to Happy
                currentBranchQuestions = [
                    MOOD_QUESTIONS_DATA.angry,
                    MOOD_QUESTIONS_DATA.drifting
                ];
            }
            currentBranchIndex = 0; // Reset index for the new branch
            askNextQuestionInBranch(); // Move to the first question in the selected branch

        } else { // This handles answers to subsequent questions within a branch
            if (isYes) {
                // If YES to any subsequent question, recommend its song and end the flow
                displayRecommendation(currentBranchQuestions[currentBranchIndex].song.title, currentBranchQuestions[currentBranchIndex].song.artist);
                endFlow();
            } else {
                // If NO to a subsequent question, move to the next in its branch
                currentBranchIndex++;
                askNextQuestionInBranch(); // Try asking the next question
            }
        }
    }

    // --- Ask the next question in the current branch or provide default/no recommendation ---
    function askNextQuestionInBranch() {
        hideAllOutputs(); // Clear previous outputs

        if (currentBranchIndex < currentBranchQuestions.length) {
            // Display the next question in the current branch
            currentQuestionText.textContent = currentBranchQuestions[currentBranchIndex].text;
            currentQuestionText.classList.remove('hidden');
            questionButtons.classList.remove('hidden');
            resetBtn.classList.add('hidden');
            console.log(`Moving to next question in branch: ${currentBranchQuestions[currentBranchIndex].text}`);
        } else {
            // All questions in the current branch have been asked, and no "Yes" was given.
            // Now apply the logical statements for default/no recommendation based on the main branch.

            let recommendedSongOutcome = null;

            if (isHappyMainChoice === true) {
                // User said YES to Happy, but NO to Energetic and NO to Focused.
                // Corresponds to: h ∧ ¬e ∧ ¬f → M
                recommendedSongOutcome = SONGS.M;
            } else if (isHappyMainChoice === false) {
                // User said NO to Happy, and NO to Angry and NO to Drifting.
                // Corresponds to: ¬h ∧ ¬a ∧ ¬d → B (NO_REC)
                recommendedSongOutcome = SONGS.NO_REC;
            }

            if (recommendedSongOutcome && recommendedSongOutcome !== SONGS.NO_REC) {
                displayRecommendation(recommendedSongOutcome.title, recommendedSongOutcome.artist);
            } else {
                displayMessage(SONGS.NO_REC.title, 'info', SONGS.NO_REC.artist);
            }
            endFlow();
        }
    }

    // --- Function to end the question flow ---
    function endFlow() {
        questionButtons.classList.add('hidden'); // Hide Yes/No buttons
        resetBtn.classList.remove('hidden'); // Show Reset button
        currentQuestionText.classList.add('hidden'); // Hide the question text
    }

    // --- Helper function to display the song recommendation ---
    function displayRecommendation(title, artist) {
        songTitle.textContent = title;
        songArtist.textContent = artist;
        recommendationOutput.classList.remove('hidden');
        messageOutput.classList.add('hidden'); // Ensure message is hidden
    }

    // --- Helper function to display messages (errors or info) ---
    function displayMessage(text, type = 'info', details = '') {
        messageText.textContent = text + (details ? ` (${details})` : '');
        messageOutput.classList.remove('hidden');
        recommendationOutput.classList.add('hidden'); // Ensure recommendation is hidden

        // Optional: Change styling based on message type
        if (type === 'error') {
            messageOutput.classList.remove('bg-blue-100', 'border-blue-400', 'text-blue-700');
            messageOutput.classList.add('bg-red-100', 'border-red-400', 'text-red-700');
        } else { // 'info' or default
            messageOutput.classList.remove('bg-red-100', 'border-red-400', 'text-red-700');
            messageOutput.classList.add('bg-blue-100', 'border-blue-400', 'text-blue-700');
        }
    }

    // --- Helper function to hide all output areas ---
    function hideAllOutputs() {
        recommendationOutput.classList.add('hidden');
        messageOutput.classList.add('hidden');
    }

    // --- Function to reset the app back to its initial state ---
    function resetAppToInitialState() {
        currentBranchQuestions = [];
        currentBranchIndex = 0;
        isHappyMainChoice = null; // Crucial: Reset the main choice
        hideAllOutputs();
        currentQuestionText.textContent = MOOD_QUESTIONS_DATA.happy.text; // Start with the happy question
        currentQuestionText.classList.remove('hidden');
        questionButtons.classList.remove('hidden'); // Show Yes/No buttons
        resetBtn.classList.add('hidden'); // Hide reset button at start
    }

    // --- Initial state setup on page load ---
    resetAppToInitialState();
});
