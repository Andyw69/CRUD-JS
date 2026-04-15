

/**
 * @returns {Promise<Object>}
 */
const fetchCharacter = async() => {
    
    const randomCharacter = Math.floor(Math.random() * 100) + 1;
    console.log(randomCharacter);

    const res = await fetch(`https://rickandmortyapi.com/api/character/${randomCharacter}`);
    const character = await res.json();

    console.log(character);
    return character

}

/**
 * 
 * @param {HTMLDivElement} element 
*/
export const BreakingbadApp = ( element ) =>{
    
    document.querySelector('#app-title').innerHTML = 'Rick and Morty'
    element.innerHTML = 'Loading inicial...'
    
    // const character = await fetchCharacter();
    const statusLabel = document.createElement('blockquote');
    const characterLabel = document.createElement('h3');
    const nextCharacterButton = document.createElement('button');

    nextCharacterButton.innerHTML = 'Next Character ->';
    nextCharacterButton.className = 'button';

    const renderQuote = (data) => {
        const {name, status} = data
        statusLabel.innerHTML = status;
        characterLabel.innerHTML = name;
        element.replaceChildren(characterLabel, statusLabel, nextCharacterButton);
    }

    fetchCharacter()
        .then( renderQuote)

    // Listeners
    nextCharacterButton.addEventListener('click', () => {
        
        element.innerHTML = 'Loading...';
        fetchCharacter().then(renderQuote);
    })
}

