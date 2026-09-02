import{r as o,j as t,a as e}from"./index-DYhT9JJt.js";function u(){const[n,i]=o.useState(""),[r,l]=o.useState("");return t("div",{className:"join",children:[t("div",{"data-reveal":!0,className:"tab-header page-head page-head--contact",children:[e("h1",{children:"Join"}),e("p",{className:"page-head__summary",children:"Introduce your research interests and contact CVL-Lab about available opportunities."})]}),e("section",{"data-reveal":!0,className:"join__section",children:t("form",{"data-reveal":!0,"data-reveal-load-delay":"80",className:"join__form",onSubmit:a=>{a.preventDefault();const s="jongbinryu@ajou.ac.kr",d=encodeURIComponent("CVL-Lab Join Inquiry"),c=encodeURIComponent(`Hello CVL-Lab,

I am interested in joining the lab.

My email: ${n||"(not provided)"}

Message:
${r||"(no message)"}
`);window.location.href=`mailto:${s}?subject=${d}&body=${c}`},children:[t("div",{"data-reveal":!0,"data-reveal-load-delay":"120",className:"join-email",children:[e("p",{children:"Your Email"}),e("input",{type:"email",placeholder:"email@example.com",value:n,onChange:a=>i(a.target.value),required:!0})]}),t("div",{"data-reveal":!0,"data-reveal-load-delay":"160",className:"join-message",children:[e("p",{children:"Message"}),e("textarea",{name:"message",className:"join__message-field",value:r,onChange:a=>l(a.target.value),required:!0})]}),e("div",{"data-reveal":!0,"data-reveal-load-delay":"200",className:"join-btn-wrapper",children:e("button",{type:"submit",className:"btn btn--primary interactive-button lift-on-hover",children:"Send Inquiry"})})]})})]})}function v(){return e(u,{})}export{v as default};
