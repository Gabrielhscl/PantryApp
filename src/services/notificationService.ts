// import * as Notifications from 'expo-notifications';
// import { Alert, Platform } from 'react-native';

// // Configura o comportamento
// Notifications.setNotificationHandler({
//   handleNotification: async () => ({
//     shouldShowAlert: true,
//     shouldPlaySound: true,
//     shouldSetBadge: false,
//     shouldShowBanner: true,
//     shouldShowList: true,
//   }),
// });

// export const NotificationService = {
//   async requestPermissions() {
//     try {
//       // Tenta configurar o canal Android (Pode falhar no Expo Go SDK 53+)
//       if (Platform.OS === 'android') {
//         try {
//           await Notifications.setNotificationChannelAsync('default', {
//             name: 'default',
//             importance: Notifications.AndroidImportance.MAX,
//             vibrationPattern: [0, 250, 250, 250],
//             lightColor: '#FF231F7C',
//           });
//         } catch (channelError) {
//           console.warn("⚠️ Aviso: Criação de canal de notificação falhou (Normal no Expo Go).", channelError);
//         }
//       }

//       const { status: existingStatus } = await Notifications.getPermissionsAsync();
//       let finalStatus = existingStatus;

//       if (existingStatus !== 'granted') {
//         const { status } = await Notifications.requestPermissionsAsync();
//         finalStatus = status;
//       }

//       if (finalStatus !== 'granted') {
//         // Não vamos travar o app, apenas avisar
//         console.log('Permissão de notificação negada.');
//         return false;
//       }
//       return true;
//     } catch (error) {
//       console.error("Erro no serviço de notificação:", error);
//       return false; // Retorna falso mas não quebra o app
//     }
//   },

//   async scheduleExpiryNotification(productName: string, expiryDate: Date) {
//     try {
//       const triggerDate = new Date(expiryDate);
//       triggerDate.setDate(triggerDate.getDate() - 2);
//       triggerDate.setHours(9, 0, 0);

//       const now = new Date();

//       // Verifica se temos permissão antes de tentar agendar
//       const settings = await Notifications.getPermissionsAsync();
//       if (!settings.granted && settings.status !== 'granted') return;

//       if (triggerDate.getTime() <= now.getTime()) {
//         await Notifications.scheduleNotificationAsync({
//           content: {
//             title: "🚨 Produto Vencendo!",
//             body: `O ${productName} vence em breve.`,
//             sound: true,
//           },
//           trigger: { seconds: 5, type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL },
//         });
//       } else {
//         await Notifications.scheduleNotificationAsync({
//           content: {
//             title: "⚠️ Validade Próxima",
//             body: `O produto ${productName} vence em 2 dias.`,
//             sound: true,
//           },
//           trigger: triggerDate,
//         });
//       }
//     } catch (error) {
//       console.warn("Falha ao agendar notificação (Ignorado no Expo Go):", error);
//     }
//   }
// };

// Versão "Modo de Segurança" para Expo Go SDK 53+
export const NotificationService = {
  // Finge que pediu permissão e deu tudo certo
  async requestPermissions() {
    console.log("🔔 [Modo Dev] Permissões de notificação simuladas (Bypassing Expo Go Error)");
    return true;
  },

  // Finge que agendou
  async scheduleExpiryNotification(productName: string, expiryDate: Date) {
    console.log(`🔔 [Modo Dev] Notificação simulada para: ${productName}`);
    // No futuro, quando gerarmos o APK final, descomentamos o código real.
  }
};