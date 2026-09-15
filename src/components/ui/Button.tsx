import React from 'react';
import { Icon, type IconName } from './Icon';

type Variant = 'default' | 'primary' | 'ghost' | 'danger';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: 'sm' | 'md';
  icon?: IconName;
  block?: boolean;
}

const VARIANT_CLASS: Record<Variant, string> = {
  default: '',
  primary: 'btn--primary',
  ghost: 'btn--ghost',
  danger: 'btn--danger',
};

export function Button({
  variant = 'default',
  size = 'md',
  icon,
  block,
  className = '',
  children,
  type = 'button',
  ...rest
}: ButtonProps) {
  const classes = [
    'btn',
    VARIANT_CLASS[variant],
    size === 'sm' ? 'btn--sm' : '',
    block ? 'btn--block' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button type={type} className={classes} {...rest}>
      {icon && <Icon name={icon} size={size === 'sm' ? 14 : 15} className="btn__icon" />}
      {children}
    </button>
  );
}

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: IconName;
  label: string;
  variant?: Variant;
}

export function IconButton({ icon, label, variant = 'ghost', className = '', ...rest }: IconButtonProps) {
  return (
    <button
      type="button"
      className={`btn btn--icon ${VARIANT_CLASS[variant]} ${className}`.trim()}
      aria-label={label}
      title={label}
      {...rest}
    >
      <Icon name={icon} size={15} />
    </button>
  );
}
