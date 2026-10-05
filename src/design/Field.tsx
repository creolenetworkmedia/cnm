import {useId,type InputHTMLAttributes,type TextareaHTMLAttributes} from 'react'
export function Field({label,error,...props}:InputHTMLAttributes<HTMLInputElement>&{label:string;error?:string}){
 const id=useId();return <div className="field"><label htmlFor={id}>{label}{props.required&&<span aria-hidden="true"> *</span>}</label><input {...props} id={id} aria-invalid={Boolean(error)} aria-describedby={error?id+'-error':undefined}/>{error&&<p className="field-error" id={id+'-error'}>{error}</p>}</div>
}
export function TextArea({label,error,...props}:TextareaHTMLAttributes<HTMLTextAreaElement>&{label:string;error?:string}){
 const id=useId();return <div className="field"><label htmlFor={id}>{label}{props.required&&<span aria-hidden="true"> *</span>}</label><textarea {...props} id={id} aria-invalid={Boolean(error)} aria-describedby={error?id+'-error':undefined}/>{error&&<p className="field-error" id={id+'-error'}>{error}</p>}</div>
}
