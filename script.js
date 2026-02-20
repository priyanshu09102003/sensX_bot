const container = document.querySelector(".container");
const chatsContainer = document.querySelector(".chats-container");
const promptForm = document.querySelector(".prompt-form");
const promptInput = promptForm.querySelector(".prompt-input");
const fileInput = promptForm.querySelector("#file-input");
const fileUploadWrapper = promptForm.querySelector(".file-upload-wrapper");
const themeToggle = document.querySelector("#theme-toggle-btn");

//Setting up the API
const API_KEY = "AIzaSyABfZIA7WPS_016Covso18Z5VQoZUoBIpI";
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`


let typingInterval , controller;
const chatHistory = [];
let userData = {message : "" , file: {}};

//Creating the user messages in the chatbox
const createMsgElement = (content , ...classes) =>{
    const div = document.createElement("div");
    div.classList.add("message" , ...classes);
    div.innerHTML = content;
    return div
}

//Scrolling to bottom automatically
const scrolltoBottom = () => container.scrollTo({ top : container.scrollHeight , behavior: "smooth"})

//Simulate typing effect for the bot response
const typingEffect = (text , textElement , botMsgDiv) => {
    textElement.textContent = " ";
    const words = text.split(" ");
    let wordIndex = 0;

    //Set an inteval to type each word
     typingInterval = setInterval(() => {
            if(wordIndex < words.length){
                textElement.textContent += (wordIndex === 0 ? " " : " ") + words[wordIndex++];
                scrolltoBottom();
            }
            else{
                clearInterval(typingInterval);
                botMsgDiv.classList.remove("loading");
                document.body.classList.remove("bot-responding");
            }
    } , 40)
}

const generateResponse = async (botMsgDiv) =>{

    const textElement = botMsgDiv.querySelector(".message-text");
    controller = new AbortController();

    //Add user message and file data to the chat history
    chatHistory.push({

        role: "user",
        parts: [{ text: userData.message }, ...(userData.file.data ? [{inline_data: (({ fileName, isImage, ...rest }) => rest)(userData.file)}]: [])]

    });

    try {
       const response = await fetch(API_URL , {
        method : "POST",
        headers: {"Content-Type" : "application/json"},
        body : JSON.stringify({contents: chatHistory}),
        signal : controller.signal
       });

       const data = await response.json();
       if(!response.ok) throw new Error(data.error.message);

      const responseText = data.candidates[0].content.parts[0].text.replace(/\*\*([^*]+)\*\*/g, '$1').trim();

      typingEffect(responseText , textElement , botMsgDiv);


      chatHistory.push({

        role: "model",
        parts: [{ text: responseText }]});

    } catch (error) {

        textElement.style.color = "#d62939";
        textElement.textContent = error.name === "AbortError" ? "Response generation stopped." : error.message;

        botMsgDiv.classList.remove("loading");
        document.body.classList.remove("bot-responding");

    }
    finally{
        userData.file = {};
    }
}

//Handling the prompt submission by the user
const handleFormSubmit = (e) =>{
    e.preventDefault();
    const userMessage = promptInput.value.trim();

    if(!userMessage || document.body.classList.contains("bot-responding"))return; //Restricting the user from sending a new message if the bot is already responding

    promptInput.value = "";
    userData.message = userMessage;
    document.body.classList.add("bot-responding" , "chats-active");
    fileUploadWrapper.classList.remove("active" , "img-attached" , "file-attached");
    

    //Generating the user message HTML with optional file attachment
    const userMsgHTML = `<p class="message-text"></p>
    ${userData.file.data ? (userData.file.isImage ? `<img src = "data:${userData.file.mime_type};base64,${userData.file.data}" class="img-attachment" />` : `<p class = "file-attachment"><span class="material-symbols-rounded">description</span>${userData.file.fileName}</p>`): ""}
    
    `;


    const userMsgDiv = createMsgElement(userMsgHTML, "user-message");
    userMsgDiv.querySelector(".message-text").textContent = userMessage;
    chatsContainer.appendChild(userMsgDiv);

    scrolltoBottom();

    setTimeout(() => {
     //Generating the bot answer HTML and add it in the chats container after 600ms
    const botMsgHTML = `<img src="avatar.png" class="avatar"><p class="message-text">Generating response...</p>`;
    const botMsgDiv = createMsgElement(botMsgHTML, "bot-message" , "loading");
    chatsContainer.appendChild(botMsgDiv);
    scrolltoBottom();


    generateResponse(botMsgDiv)

    } , 600);

}

//Getting the change of icon on choosing the file
fileInput.addEventListener("change" , () => {
    const file = fileInput.files[0];
    if(!file) return;

    const isImage = file.type.startsWith("image/")
    const reader = new FileReader();
    reader.readAsDataURL(file);

    reader.onload = (e) => {
        fileInput.value = "";
        const base64String = e.target.result.split(",")[1];
        fileUploadWrapper.querySelector(".file-preview").src = e.target.result;
        fileUploadWrapper.classList.add("active" , isImage ? "img-attached" : "file-attached");

        //Store file Data in userData object
        userData.file = {fileName : file.name , data: base64String , mime_type: file.type , isImage };
    }
});

//Cancelling file Upload
document.querySelector("#cancel-file-btn").addEventListener("click" , () => {
    userData.file = {};
    fileUploadWrapper.classList.remove("active" , "img-attached" , "file-attached");

});

//Stop ongoing bot responses
document.querySelector("#stop-response-btn").addEventListener("click" , () => {
    userData.file = {};
    controller?.abort();
    clearInterval(typingInterval);
    chatsContainer.querySelector(".bot-message.loading").classList.remove("loading");
    document.body.classList.remove("bot-responding");

});

//Deleting all chats
document.querySelector("#delete-chats-btn").addEventListener("click" , () => {
    chatHistory.length = 0;
    chatsContainer.innerHTML = "";
    document.body.classList.remove("bot-responding" , "chats-active");


});

//Handle suggestions click
document.querySelectorAll(".suggestion-item").forEach(item => {
    item.addEventListener("click" , () => {
        promptInput.value = item.querySelector(".text").textContent; //Setting suggestions as prompt input value

        promptForm.dispatchEvent(new Event("submit"));
    });
});


// Show/hide controls for mobile on prompt input focus
document.addEventListener("click", ({ target }) => {
    const wrapper = document.querySelector(".prompt-wrapper");
    const shouldHide = target.classList.contains("prompt-input") ||
        (wrapper.classList.contains("hide-controls") &&
        (target.id === "add-file-btn" || target.id === "stop-response-btn"));
    wrapper.classList.toggle("hide-controls", shouldHide);
});

//Toggling between light and dark mode
themeToggle.addEventListener("click" , () => {
   const isLightTheme = document.body.classList.toggle("light-theme");

   //Preventing theme change on refresh
   localStorage.setItem("themeColor" , isLightTheme ? "light_mode" : "dark_mode");


   themeToggle.textContent = isLightTheme ? "dark_mode" : "light_mode" //updating the theme icon
});

//setting initial theme for local storage
 const isLightTheme = localStorage.getItem("themeColor") === "light_mode";
 document.body.classList.toggle("light-theme" , isLightTheme);
    themeToggle.textContent = isLightTheme ? "dark_mode" : "light_mode";





promptForm.addEventListener("submit" , handleFormSubmit);
promptForm.querySelector("#add-file-btn").addEventListener("click" , () => fileInput.click());



