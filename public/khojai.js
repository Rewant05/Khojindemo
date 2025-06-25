const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
recognition.lang = 'en-US';
recognition.interimResults = false;

const synth = window.speechSynthesis;

const user1 = JSON.parse(localStorage.getItem("enteredEmail"));

document.getElementById('khojAiBtn').onclick = () => {
    recognition.start();
    speak("Hello! I am Helper A I, your voice assistant. How can I assist you today?");
};

recognition.onresult = (event) => {
    const query = event.results[0][0].transcript.toLowerCase();
    console.log("User said:", query);
    executeCommand(query);
};

function speak(text) {
    const utterance = new SpeechSynthesisUtterance(text);
    synth.speak(utterance);
}

function executeCommand(query) {
    setTimeout(() => {
        if (query.includes('wikipedia')) {
            speak('Searching Wikipedia...');
            const searchTerm = query.replace('wikipedia', '').trim();
            window.open(`https://en.wikipedia.org/wiki/${searchTerm}`, '_blank');
            speak(`Here is what I found about ${searchTerm} on Wikipedia.`);
        } else if (query.includes('open youtube')) {
            speak('Opening YouTube.');
            window.open('https://www.youtube.com', '_blank');
        } else if (query.includes('open google')) {
            speak('Opening Google.');
            window.open('https://www.google.com', '_blank');
        } else if (query.includes('play music')) {
            speak('Playing your favorite music.');
            window.open('https://www.spotify.com', '_blank');
        } else if (query.includes('the time')) {
            const now = new Date();
            const time = now.toLocaleTimeString();
            speak(`The time is ${time}.`);
        } else if (query.includes('search')) {
            const searchTerm = query.replace('search', '').trim();
            speak(`Searching Google for ${searchTerm}.`);
            window.open(`https://www.google.com/search?q=${searchTerm}`, '_blank');
        } else if (query.includes('bye-bye')) {
            speak('Goodbye! Have a nice day!');
        } else if (query.includes('what is your name')) {
            speak(`My name is KHOJ AI, here to help you.`);
        }
        
        // **KHOJ-Specific Features**
        else if (query.includes('how to report a lost item')) {
            speak("To report a lost item, visit our website and click on 'Report Lost'. Provide necessary details and we will help you find it.");
        } else if (query.includes('how to report a found item')) {
            speak("If you've found an item, click on 'Report Found' on our website and enter the details. We will try to match it with reported lost items.");
        } else if (query.includes('how does khoj work')) {
            speak("KHOJ connects people who have lost items with those who have found them. Our system intelligently matches lost and found reports.");
        } else if (query.includes('is khoj safe')) {
            speak("Yes, KHOJ ensures data privacy and secure handling of lost and found reports. We verify matches to avoid false claims.");
        } else if (query.includes('how do i contact khoj')) {
            speak("You can reach us through the contact page on our website, or email us at support@khoj-in.netlify.app.");
        } else if (query.includes('where can i see my reports')) {
            speak("You can check your reported items by logging into your KHOJ account and navigating to 'My Reports'.");
        } else {
            speak("I'm sorry, I didn't understand that. Please ask something related to KHOJ or general assistance.");
        }
    }, 2000); 
}

recognition.onerror = (event) => {
    console.error("Speech recognition error:", event.error);
    speak("Sorry, I didn't catch that. Please try again.");
};

recognition.onspeechend = () => {
    recognition.stop();
};
