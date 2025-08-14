export async function loadPartials(root=document){
  const header = document.querySelector('[data-include="header"]');
  const footer = document.querySelector('[data-include="footer"]');
  if(header){ header.innerHTML = await (await fetch('./partials/header.html')).text(); }
  if(footer){ footer.innerHTML = await (await fetch('./partials/footer.html')).text(); }
}