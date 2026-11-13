import { redirect } from 'next/navigation';

export default function LojistaRedirectPage() {
  redirect('/sobre?aba=lojistas');
}
