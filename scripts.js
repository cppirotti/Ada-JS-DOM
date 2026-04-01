// alert("Hello world, confirmando!");

// getElementById
const titulo = document.getElementById("titulo");
console.log(titulo);
console.log(titulo.innerText);
console.log(titulo.innerHTML);
setTimeout(() => {
  titulo.innerText = "Novo Título";
  console.log(titulo.innerText);
}, 1000);
setTimeout(() => {
  titulo.innerHTML =
    "<div><p id='teste'><strong>Esse é</strong> meu novo título</p></div>";
  console.log(titulo.innerText); // ?
  console.log(titulo.innerHTML);
  const teste = document.getElementById("teste");
  teste.innerText = "texto trocado";
}, 2000);

// const subtitulo = document.getElementById("subtitulo");
// console.log(subtitulo);

// // getElementsByClassName
// const lista = document.getElementsByClassName("item");
// console.log(lista);

// // getElementsByTagName
// const listaOrdenada = document.getElementsByTagName("li");
// console.log(listaOrdenada);

// // querySelector
// const paragrafo = document.querySelector(".paragrafo");
// console.log(paragrafo);

// // querySelectorAll
// const paragrafos = document.querySelectorAll(".paragrafo");
// console.log(paragrafos);

// const articleParagrafos = document.querySelectorAll("article.paragrafo");
// console.log(articleParagrafos);

// const lis = document.querySelectorAll("li");
// console.log(lis);