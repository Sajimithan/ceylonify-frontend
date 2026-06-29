import React, { useCallback, useEffect, useState } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { CheckCircle, XCircle, AlertTriangle, HelpCircle } from 'lucide-react-native';

export type AlertType = 'success' | 'error' | 'warning' | 'confirm';

export interface AppAlertConfig {
  type?: AlertType;
  title: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
}

interface Props extends AppAlertConfig {
  visible: boolean;
  onDismiss: () => void;
}

const TYPE_CFG = {
  success: { accent: '#0EA5A4', iconBg: '#F0FDF9', Icon: CheckCircle },
  error:   { accent: '#EF4444', iconBg: '#FEF2F2', Icon: XCircle },
  warning: { accent: '#F59E0B', iconBg: '#FFFBEB', Icon: AlertTriangle },
  confirm: { accent: '#0B1220', iconBg: '#F3F4F6', Icon: HelpCircle },
};

export function AppAlert({
  visible, onDismiss,
  type = 'success', title, message,
  confirmText, cancelText, onConfirm, onCancel,
}: Props) {
  const isConfirm = type === 'confirm';
  const cfg = TYPE_CFG[type];
  const { Icon } = cfg;

  useEffect(() => {
    if (visible && !isConfirm) {
      const t = setTimeout(onDismiss, 2800);
      return () => clearTimeout(t);
    }
  }, [visible, isConfirm, onDismiss]);

  return (
    <Modal transparent visible={visible} animationType="fade" statusBarTranslucent onRequestClose={onDismiss}>
      <TouchableOpacity
        style={s.backdrop}
        activeOpacity={1}
        onPress={isConfirm ? undefined : onDismiss}
      >
        <TouchableOpacity activeOpacity={1} style={s.card}>
          {/* Teal accent top stripe */}
          <View style={[s.accentStripe, { backgroundColor: cfg.accent }]} />

          <View style={s.body}>
            {/* Icon */}
            <View style={[s.iconCircle, { backgroundColor: cfg.iconBg }]}>
              <Icon size={30} color={cfg.accent} />
            </View>

            {/* Text */}
            <Text style={s.title}>{title}</Text>
            {message ? <Text style={s.message}>{message}</Text> : null}

            {/* Buttons */}
            {isConfirm ? (
              <View style={s.btnRow}>
                <TouchableOpacity
                  style={s.cancelBtn}
                  onPress={() => { onCancel?.(); onDismiss(); }}
                  activeOpacity={0.75}
                >
                  <Text style={s.cancelBtnText}>{cancelText ?? 'Cancel'}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.primaryBtn, { backgroundColor: cfg.accent }]}
                  onPress={() => { onConfirm?.(); onDismiss(); }}
                  activeOpacity={0.85}
                >
                  <Text style={s.primaryBtnText}>{confirmText ?? 'Confirm'}</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={[s.primaryBtn, { backgroundColor: cfg.accent, paddingHorizontal: 40 }]}
                onPress={onDismiss}
                activeOpacity={0.85}
              >
                <Text style={s.primaryBtnText}>{confirmText ?? 'OK'}</Text>
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

export function useAppAlert() {
  const [state, setState] = useState<{ visible: boolean } & AppAlertConfig>({
    visible: false, title: '',
  });

  const show = useCallback((cfg: AppAlertConfig) => {
    setState({ ...cfg, visible: true });
  }, []);

  const hide = useCallback(() => {
    setState(prev => ({ ...prev, visible: false }));
  }, []);

  const alertEl = <AppAlert {...state} onDismiss={hide} />;

  return { show, hide, alertEl };
}

const s = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(11,18,32,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    width: '100%',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 32,
    elevation: 20,
  },
  accentStripe: {
    height: 5,
    width: '100%',
  },
  body: {
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingTop: 28,
    paddingBottom: 28,
  },
  iconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0B1220',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: 0.1,
  },
  message: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 24,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
  },
  primaryBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
