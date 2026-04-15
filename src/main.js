import './style.css'
import javascriptLogo from './assets/javascript.svg'
import viteLogo from './assets/vite.svg'
import heroImg from './assets/hero.png'
import { UsersApp } from './users/users-app'
// import { BreakingbadApp } from './breakingbad/breakingbad-app'

document.querySelector('#app').innerHTML = `
<section id="center">
  <div class="hero">
    <img src="${heroImg}" class="base" width="170" height="179">
    <img src="${javascriptLogo}" class="framework" alt="JavaScript logo"/>
    <img src=${viteLogo} class="vite" alt="Vite logo" />
  </div>
  <div>
    <h1 id = "app-title">Hello Vite!</h1>
    <div class= "card">
    
    </div>
  </div>
  
</section>
`

const element = document.querySelector('.card')
// BreakingbadApp(element);
UsersApp(element);



//<section id="next-steps">
//   <div id="docs">
//     <svg class="icon" role="presentation" aria-hidden="true"><use href="/icons.svg#documentation-icon"></use></svg>
//     <h2>Documentation</h2>
//     <p>Your questions, answered</p>
    
//   </div>
  
// </section>