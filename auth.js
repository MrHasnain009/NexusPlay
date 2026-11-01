
export function showMessage(message, isError = false) {
  const element = document.getElementById('message');
  if (!element) return;

  element.textContent = message;
  element.classList.remove('hidden', 'text-red-400', 'text-green-400');
  element.classList.add(isError ? 'text-red-400' : 'text-green-400');
}

export function togglePassword(inputId) {
  const input = document.getElementById(inputId);
  if (!input) return;

  input.type = input.type === 'password' ? 'text' : 'password';
}
