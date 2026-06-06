(function (global) {
const root = typeof global !== 'undefined' ? global : globalThis;
if (root.Messenger) return;

class MessengerI18n {
	static LOCALES = {
		ru: {
			loading: 'Загрузка…',
			loadingChat: (name) => `Загрузка чата «${name}»…`,
			chatOpenError: (name) => `Не удалось открыть чат «${name}»`,
			selectChat: 'Выберите чат для начала общения',
			messagesLoading: 'Сообщения загружаются',
			messagesEmpty: 'Сообщений пока нет',
			noChats: 'Нет чатов',
			noContacts: 'Нет контактов',
			contactsNotFound: 'Контакты не найдены',
			contactsLoadError: 'Ошибка загрузки контактов',
			newChat: 'Новый чат',
			directChat: 'Личный чат',
			group: 'Группа',
			createChat: 'Начать чат',
			createGroup: 'Создать группу',
			creating: 'Создание…',
			groupName: 'Название группы…',
			groupExtraPassword: 'Дополнительный пароль группы (передаётся вне мессенджера)',
			groupExtraPasswordHint: 'Автопароль группы будет выдан участникам через сервер. Доп. пароль знают только те, кому вы его сообщите.',
			groupCustomPasswordTitle: 'Пароль группы',
			groupCustomPasswordHint: 'Введите дополнительный пароль группы (его передали вам отдельно).',
			groupCustomPasswordPlaceholder: 'Дополнительный пароль',
			ok: 'OK',
			masterPasswordLock: 'Нет ключа шифрования для чата',
			sendEncryptionKeyFailed:
				'Не удалось получить ключ шифрования для чата. Откройте чат заново или обратитесь к участникам группы.',
			sendEncryptionNeedExtraPassword:
				'Для отправки нужен доп. пароль чата. Введите его в меню чата или при отправке.',
			sendEncryptionMasterMismatch:
				'Ключ на сервере не подходит к текущему мастер-паролю. Ключи перевыданы — попробуйте отправить снова; старые сообщения могут не расшифроваться.',
			lockChat: '🔒',
			chatEncryption: 'Шифрование',
			chatEncryptionTitle: 'Шифрование чата',
			chatEncryptionStatusOn: 'Доп. пароль введён — защищённые сообщения видны',
			chatEncryptionStatusOff: 'Доп. пароль выключен — только базовое шифрование',
			chatEncryptionStatusUnset: 'Доп. пароль не задан',
			chatEncryptionShareHint:
				'Передайте пароль собеседнику вне мессенджера — он вводит его у себя в этом меню. ' +
				'Без пароля ваши защищённые сообщения не прочитать. Сообщения без доп. пароля читаются обоими по мастер-паролю.',
			chatEncryptionSetPassword: 'Задать доп. пароль',
			chatEncryptionDisableExtra: 'Отключить доп. шифрование',
			chatEncryptionEnableExtra: 'Включить доп. шифрование',
			chatEncryptionRemovePassword: 'Удалить доп. пароль',
			passwordsDoNotMatch: 'Пароли не совпадают',
			groupKeySetupFailed:
				'Группа создана, но не удалось сохранить ключи шифрования. Откройте группу снова — попытка повторится автоматически.',
			groupCreatorMissingEncryption:
				'На сервере не сохранён ваш публичный ключ шифрования. Выйдите и войдите снова с мастер-паролем или в Настройках заново сохраните мастер-пароль.',
			groupMembersMissingEncryption:
				'У части участников не настроен мастер-пароль шифрования — группа создана, им ключ будет выдан после настройки.',
			chatEncryptionRemoveConfirm: 'Доп. пароль будет сброшен для этого чата. Защищённые сообщения снова станут скрытыми.',
			msgLocked: 'Не удалось расшифровать',
			msgHiddenProtected: '🔒 Сообщение',
			msgActionEnterPassword: 'Ввести пароль',
			sendExtraPasswordTitle: 'Доп. пароль',
			sendExtraPasswordMessage: 'В этом чате используется доп. пароль. Введите его или отправьте сообщение без защиты.',
			sendExtraPasswordEnter: 'Ввести доп. пароль',
			sendExtraPasswordBasic: 'Отправить без пароля',
			msgBasicTier: 'Без доп. пароля',
			groupExtraPasswordToggle: 'Режим доп. пароля в группе',
			groupExtraPasswordToggleHint: 'Сообщения без доп. пароля помечаются отдельно; защищённые видят только те, кому передали пароль',
			searchContacts: 'Поиск контактов…',
			searchChats: 'Поиск…',
			writeMessage: 'Написать сообщение…',
			theme: 'Тема',
			themeGroupDark: 'Тёмные темы',
			themeGroupLight: 'Светлые темы',
			displayNameRequired: 'Укажите отображаемое имя',
			yesterday: 'Вчера',
			selectFile: 'Выбрать файл',
			takePhoto: 'Сделать фото',
			uploadError: 'Ошибка загрузки',
			downloading: 'Скачать',
			today: 'Сегодня',
			newMessages: 'Новые сообщения',
			messageFailed: 'Не отправлено',
			retryMessage: 'Нажмите для повтора',
			settings: 'Настройки',
			profile: 'Профиль',
			profileTitle: 'Профиль',
			qrProfileTitle: 'QR-код профиля',
			qrGroupTitle: 'QR-код группы',
			qrClose: 'Закрыть',
			qrLibMissing: 'Библиотека QR не загружена',
			invitationsTab: 'Приглашения',
			invitationsHint: 'До 5 активных ссылок. Каждая действует 3 дня.',
			invitationsActive: 'Активна',
			invitationsGenerate: 'Создать ссылку',
			invitationsEmpty: 'Нет активных ссылок',
			invitationsLimit: 'Достигнут лимит активных ссылок (5)',
			invitationsExpires: 'Действует до',
			invitationsCopy: 'Копировать',
			invitationsCopied: 'Ссылка скопирована',
			invitationsQr: 'QR-код',
			qrInviteTitle: 'QR-код приглашения',
			invitationsCount: (n, max) => `${n} из ${max} активных`,
			logout: 'Выход',
			adminPanel: 'Админка',
			loginLabel: 'Логин',
			changeLogin: 'Сменить логин',
			changeLoginTitle: 'Сменить логин',
			changeLoginSubmit: 'Сменить',
			changeLoginConfirmTitle: 'Подтвердите смену логина',
			changeLoginConfirmMessage: (oldLogin, newLogin) =>
				`Логин будет изменён: @${oldLogin} → @${newLogin}. Продолжить?`,
			loginChangeHint: 'Старый логин останется привязан к вашему аккаунту для переходов по ссылкам.',
			loginChangeOncePerDay: 'Логин можно менять не чаще одного раза в сутки',
			loginChangeAvailableAt: (when) => `Смена логина будет доступна ${when}`,
			contactLoginChanged: (name, oldLogin, newLogin) =>
				`${name} сменил(а) логин: @${oldLogin} → @${newLogin}`,
			loginChangedRedirect: (oldLogin, newLogin) =>
				`Логин пользователя изменён: @${oldLogin} → @${newLogin}`,
			displayNameLabel: 'Имя',
			emailLabel: 'Email',
			phoneLabel: 'Телефон',
			photoLabel: 'Фото профиля',
			editAvatar: 'Изменить',
			profileDetailsTitle: 'Email и телефон',
			accountTab: 'Аккаунт',
			securityTab: 'Безопасность',
			appearanceTab: 'Оформление',
			chatSettingsTab: 'Настройки чатов',
			sendOnEnter: 'Отправка по Enter',
			sendOnEnterHint: 'Enter отправляет сообщение, Shift+Enter — новая строка',
			foldersTab: 'Папки',
			aboutAppTab: 'О приложении',
			debugLogButton: 'Отладка',
			debugLogTitle: 'Журнал загрузки',
			debugLogCopy: 'Скопировать',
			debugLogClear: 'Очистить',
			debugLogClose: 'Закрыть',
			debugLogEmpty: 'Записей пока нет',
			debugLogCopied: 'Скопировано',
			helpTab: 'Помощь',
			changelogTitle: 'История изменений',
			contentEmpty: 'Текст не задан',
			aboutMeLabel: 'О себе',
			aboutMePlaceholder: 'Расскажите о себе (до 140 символов)',
			statusTextHint: 'До 20 символов',
			changePhoto: 'Сменить фото',
			saveProfile: 'Сохранить',
			changePassword: 'Смена пароля',
			passwordSectionLogin: 'Пароль входа',
			passwordSectionMaster: 'Мастер-пароль шифрования',
			masterPasswordHint: 'Не хранится на сервере. Без него переписку не расшифровать.',
			masterSameAsLogin: 'Мастер-пароль совпадает с паролем входа',
			masterSameAsLoginHint: 'Используется пароль входа. Отдельный мастер-пароль не нужен.',
			enterLoginPasswordToMerge: 'Укажите текущий пароль входа в поле выше',
			currentPassword: 'Текущий пароль входа',
			newPassword: 'Новый пароль входа',
			currentMasterPassword: 'Текущий мастер-пароль',
			newMasterPassword: 'Новый мастер-пароль',
			repeatMasterPassword: 'Повторите новый мастер-пароль',
			changeMasterPassword: 'Сменить мастер-пароль',
			setupMasterPassword: 'Настроить мастер-пароль',
			saved: 'Сохранено',
			appSettings: 'Настройки приложения',
			loadProfileError: 'Не удалось загрузить профиль',
			privacy: 'Приватность',
			searchableByLogin: 'Разрешить поиск по логину',
			searchableByName: 'Разрешить поиск по имени',
			allowInviteLabel: 'Пригласить в чат',
			showOnlineStatusLabel: 'Видеть статус в сети',
			allowWriteLabel: 'Писать могут',
			privacyEveryone: 'Все',
			privacyContacts: 'Контакты',
			save: 'Сохранить',
			archiveFolder: 'Архив',
			openArchive: 'Открыть архив',
			writeMessageBtn: 'Написать',
			savePrivacy: 'Сохранить настройки',
			statusTextLabel: 'Статус',
			statusTextPlaceholder: 'Статус…',
			searchContactsHint: 'Введите имя или логин для поиска',
			filterContactsHint: 'Поиск среди контактов',
			searchMinChars: 'Введите не менее 4 символов',
			clearCache: 'Очистить кеш сообщений',
			clearAllCache: 'Очистить весь кеш',
			notifications: 'Уведомления',
			notificationsEnableTitle: 'Включить уведомления?',
			notificationsEnableMsg: 'Вы будете получать пуш-уведомления о новых сообщениях, когда приложение свёрнуто или закрыто. В уведомлении показывается имя отправителя или название группы; текст сообщения не передаётся из-за сквозного шифрования.',
			notificationsDisableTitle: 'Выключить уведомления?',
			notificationsDisableMsg: 'Пуш-уведомления на этом устройстве приходить не будут.',
			notificationsEnabledOk: 'Уведомления включены',
			notificationsDisabledOk: 'Уведомления выключены',
			notificationsDenied: 'Уведомления заблокированы в браузере. Разрешите их для этого сайта в настройках и попробуйте снова.',
			notificationsUnsupported: 'Уведомления недоступны в этом браузере или режиме (требуется HTTPS и установка приложения).',
			notificationsFailed: 'Не удалось включить уведомления. Попробуйте позже.',
			muteNotifications: 'Отключить уведомления',
			unmuteNotifications: 'Включить уведомления',
			clearCacheConfirmTitle: 'Очистить кеш сообщений?',
			clearCacheConfirmMsg: 'Сообщения будут перезагружены с сервера. Изображения сохранятся.',
			clearAllConfirmTitle: 'Очистить весь кеш?',
			clearAllConfirmMsg: 'Все кешированные данные включая изображения будут удалены.',
			cacheCleared: 'Кеш очищен',
			tokenChanged: 'Сессия обновлена. Перезагрузка сообщений…',
			networkOffline: 'Нет соединения',
			networkOfflineMsg: 'Не удалось подключиться к серверу. Проверьте интернет и обновите страницу.',
			confirm: 'Подтвердить',
			cancel: 'Отмена',
			back: 'Назад',
			themeLight: 'Светлая',
			themeDark: 'Тёмная',
			showProfile: 'Профиль',
			groupProfile: 'Группа',
			groupMembers: 'Участники',
			groupAddMembers: 'Добавить участников',
			groupCreator: 'Создатель',
			groupAdmin: 'Админ',
			groupNameLabel: 'Название группы',
			grantAdmin: 'Сделать администратором',
			revokeAdmin: 'Снять права администратора',
			grantAdminConfirm: 'Назначить {name} администратором?',
			revokeAdminConfirm: 'Снять права администратора с {name}?',
			removeMember: 'Удалить из группы',
			systemGroupRenamed: '{actor} переименовал(а) группу в «{name}»',
			systemGroupAvatarChanged: '{actor} изменил(а) фото группы',
			systemGroupAdminGranted: '{actor} назначил(а) {target} администратором',
			systemGroupAdminRevoked: '{actor} снял(а) права администратора с {target}',
			changeGroupAvatar: 'Изменить фото группы',
			avatarSourceTitle: 'Фото профиля',
			avatarImageOnly: 'Выберите изображение.',
			avatarFromFile: 'Загрузить из файла',
			avatarFromCamera: 'Сделать снимок',
			avatarCropTitle: 'Редактирование фото',
			avatarCropHint: 'Перетащите и увеличьте — круг показывает, как будет выглядеть аватар',
			avatarCropZoom: 'Масштаб',
			avatarCropApply: 'Готово',
			cameraTitle: 'Камера',
			cameraCapture: 'Снять',
			cameraSwitch: 'Сменить камеру',
			cameraRetry: 'Повторить',
			cameraUnavailable: 'Камера недоступна на этом устройстве или в этом браузере',
			cameraDenied: 'Не удалось получить доступ к камере. Разрешите доступ в настройках браузера.',
			groupSaved: 'Сохранено',
			groupSaveError: 'Не удалось сохранить',
			groupJoinByLink: 'Приглашение по ссылке',
			groupJoinByLinkHint: 'По ссылке можно вступить в группу без добавления администратором',
			groupInviteLink: 'Ссылка группы',
			groupJoinTitle: 'Вступить в группу',
			groupJoinBtn: 'Вступить',
			groupJoinDisabled: 'Вступление по ссылке отключено',
			groupJoinOpenChat: 'Открыть чат',
			clearHistory: 'Очистить историю',
			clearHistoryTitle: 'Очистить историю?',
			clearHistoryMsg: 'Сообщения будут удалены без возможности восстановления.',
			alsoDeleteFor: (name) => `Также удалить у ${name}`,
			deleteChat: 'Удалить чат',
			deleteChatTitle: 'Удалить чат?',
			deleteChatMsg: 'Чат и все сообщения будут удалены.',
			leaveGroup: 'Выйти из группы',
			leaveGroupTitle: 'Выйти из группы?',
			leaveGroupMsg: 'Вы покинете группу. Если вы последний участник — группа будет удалена.',
			blockUser: 'Заблокировать пользователя',
			blockUserTitle: 'Заблокировать пользователя?',
			blockUserMsg: 'Пользователь исчезнет из контактов и не сможет писать вам. Его сообщения не будут доставляться.',
			blockGroup: 'Заблокировать группу',
			blockGroupTitle: 'Заблокировать группу?',
			blockGroupMsg: 'Вы выйдете из группы. Сообщения не будут доставляться, добавить вас снова смогут только по ссылке (если она включена).',
			groupExcludedFromJoin: 'Вас исключили из этой группы. Вступить по ссылке нельзя — попросите администратора добавить вас вручную.',
			findInChat: 'Найти',
			searchInChat: (name) => `Поиск: ${name}`,
			moveToFolder: 'Переместить в папку',
			createFolder: 'Создать папку',
			createFolderTitle: 'Новая папка',
			folderNamePlaceholder: 'Название папки…',
			allChats: 'Все чаты',
			noFolders: 'Нет папок',
			folderSettings: 'Папки',
			folderSettingsHint: 'Перетащите для изменения порядка. Нажмите на название для переименования.',
			folderRename: 'Переименовать',
			folderDeleteConfirm: 'Удалить папку «{name}»?',
			folderDelete: 'Удалить папку',
			folderIconLabel: 'Иконка',
			folderIconChoose: 'Выбрать иконку',
			folderIconPickerTitle: 'Иконка папки',
			folderIconTabEmoji: 'Эмодзи',
			folderIconTabSvg: 'Иконки',
			folderIconCustomEmoji: 'Свой символ',
			lastSeen: 'Был(а) в сети',
			lastSeenNever: 'Давно не заходил(а)',
			lastSeenJustNow: 'только что',
			lastSeenMinutesAgo: (n) => {
				const mod10 = n % 10;
				const mod100 = n % 100;
				const unit = (mod10 === 1 && mod100 !== 11) ? 'минуту'
					: (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) ? 'минуты' : 'минут';
				return `${n} ${unit} назад`;
			},
			lastSeenHourAgo: 'час назад',
			lastSeenTwoHoursAgo: '2 часа назад',
			onlineNow: 'В сети',
			idleNow: 'Неактивен',
			typeLabels: {
				direct: 'личный чат',
				group: 'группа',
				public_group: 'публичная группа',
			},
			sectionLabels: {
				direct: 'Личные сообщения',
				group: 'Группы',
				public_group: 'Публичные группы',
			},
			unnamed: '(без названия)',
			activityLabels: {
				typing: (name) => `${name} печатает`,
				sendingFile: (name) => `${name} отправляет файл`,
				sendingImage: (name) => `${name} отправляет изображение`,
			},
			activityLabelMany: (count) => `${count} человека пишут`,
			msgActionEdit: 'Редактировать',
			msgActionReply: 'Ответить',
			msgActionForward: 'Переслать',
			msgActionCopy: 'Скопировать текст',
			msgActionSelect: 'Выбрать',
			msgActionDelete: 'Удалить',
			deleteForMe: 'Удалить у меня',
			deleteForEveryone: 'Удалить у всех',
			deleteMessageTitle: 'Удалить сообщение?',
			deleteMessageMsg: 'Сообщение будет удалено без возможности восстановления.',
			forwardedFrom: (name) => `(от ${name})`,
			messageDeleted: 'Сообщение удалено',
			edited: 'изм.',
			editMessageTitle: 'Редактировать сообщение',
			forwardTitle: 'Переслать',
			forwardSend: 'Отправить',
			forwardMaxContacts: 'Можно выбрать не более 10 контактов',
			forwardNotAllowed: 'Нельзя переслать защищённое или недоступное сообщение',
			forwardSearch: 'Поиск чатов и контактов',
			forwardChatsNotFound: 'Чаты не найдены',
			textCopied: 'Текст скопирован',
			selectMode: 'Выбрано',
			selectCancel: 'Отмена',
			selectDelete: 'Удалить',
		},
		en: {
			loading: 'Loading…',
			loadingChat: (name) => `Loading chat "${name}"…`,
			chatOpenError: (name) => `Failed to open chat "${name}"`,
			selectChat: 'Select a chat to start messaging',
			messagesLoading: 'Loading messages…',
			messagesEmpty: 'No messages yet',
			noChats: 'No chats',
			noContacts: 'No contacts',
			contactsNotFound: 'No contacts found',
			contactsLoadError: 'Failed to load contacts',
			newChat: 'New Chat',
			directChat: 'Direct Message',
			group: 'Group',
			createChat: 'Start Chat',
			createGroup: 'Create Group',
			creating: 'Creating…',
			groupName: 'Group name…',
			groupExtraPassword: 'Extra group password (shared out-of-band)',
			groupExtraPasswordHint: 'Auto password is delivered via server. Extra password is only for people you tell directly.',
			groupCustomPasswordTitle: 'Group password',
			groupCustomPasswordHint: 'Enter the extra group password you received separately.',
			groupCustomPasswordPlaceholder: 'Extra password',
			ok: 'OK',
			masterPasswordLock: 'No encryption key for this chat',
			sendEncryptionKeyFailed:
				'Could not obtain an encryption key for this chat. Reopen the chat or ask group members to open it.',
			sendEncryptionNeedExtraPassword:
				'Enter the chat extra password from the chat menu or when sending.',
			sendEncryptionMasterMismatch:
				'The server key does not match your master password. Keys were re-issued — try sending again; older messages may stay locked.',
			lockChat: '🔒',
			chatEncryption: 'Encryption',
			chatEncryptionTitle: 'Chat encryption',
			chatEncryptionStatusOn: 'Extra password entered — protected messages visible',
			chatEncryptionStatusOff: 'Extra password off — basic encryption only',
			chatEncryptionStatusUnset: 'Extra password not set',
			chatEncryptionShareHint:
				'Share the password with the other person out of band — they enter it here on their device. ' +
				'Without it they cannot read your protected messages. Basic-tier messages still decrypt with the master password.',
			chatEncryptionSetPassword: 'Set extra password',
			chatEncryptionDisableExtra: 'Disable extra encryption',
			chatEncryptionEnableExtra: 'Enable extra encryption',
			chatEncryptionRemovePassword: 'Remove extra password',
			passwordsDoNotMatch: 'Passwords do not match',
			groupKeySetupFailed:
				'Group was created, but encryption keys could not be saved. Open the group again to retry automatically.',
			groupCreatorMissingEncryption:
				'Your encryption public key is not stored on the server. Log out and sign in again with your master password, or re-save it in Settings.',
			groupMembersMissingEncryption:
				'Some members have not set up encryption — the group was created; they will receive keys after setup.',
			chatEncryptionRemoveConfirm: 'Extra password will be cleared for this chat. Protected messages will be hidden again.',
			msgLocked: 'Could not decrypt',
			msgHiddenProtected: '🔒 Message',
			msgActionEnterPassword: 'Enter password',
			sendExtraPasswordTitle: 'Extra password',
			sendExtraPasswordMessage: 'This chat uses an extra password. Enter it or send without protection.',
			sendExtraPasswordEnter: 'Enter extra password',
			sendExtraPasswordBasic: 'Send without password',
			msgBasicTier: 'Without extra password',
			groupExtraPasswordToggle: 'Group extra-password mode',
			groupExtraPasswordToggleHint: 'Messages without extra password are marked; protected ones need the shared password',
			searchContacts: 'Search contacts…',
			searchChats: 'Search…',
			writeMessage: 'Write a message…',
			theme: 'Theme',
			themeGroupDark: 'Dark themes',
			themeGroupLight: 'Light themes',
			displayNameRequired: 'Enter a display name',
			yesterday: 'yesterday',
			selectFile: 'Choose file',
			takePhoto: 'Take photo',
			uploadError: 'Upload error',
			downloading: 'Download',
			today: 'Today',
			newMessages: 'New messages',
			messageFailed: 'Failed to send',
			retryMessage: 'Tap to retry',
			settings: 'Settings',
			profile: 'Profile',
			profileTitle: 'Profile',
			qrProfileTitle: 'Profile QR code',
			qrGroupTitle: 'Group QR code',
			qrClose: 'Close',
			qrLibMissing: 'QR library not loaded',
			invitationsTab: 'Invitations',
			invitationsHint: 'Up to 5 active links. Each link is valid for 3 days.',
			invitationsActive: 'Active',
			invitationsGenerate: 'Create link',
			invitationsEmpty: 'No active links',
			invitationsLimit: 'Active link limit reached (5)',
			invitationsExpires: 'Valid until',
			invitationsCopy: 'Copy',
			invitationsCopied: 'Link copied',
			invitationsQr: 'QR code',
			qrInviteTitle: 'Invitation QR code',
			invitationsCount: (n, max) => `${n} of ${max} active`,
			logout: 'Log out',
			adminPanel: 'Admin',
			loginLabel: 'Login',
			changeLogin: 'Change login',
			changeLoginTitle: 'Change login',
			changeLoginSubmit: 'Change',
			changeLoginConfirmTitle: 'Confirm login change',
			changeLoginConfirmMessage: (oldLogin, newLogin) =>
				`Login will change: @${oldLogin} → @${newLogin}. Continue?`,
			loginChangeHint: 'Your old login stays linked to your account for existing profile links.',
			loginChangeOncePerDay: 'You can change your login at most once per day',
			loginChangeAvailableAt: (when) => `Login change available ${when}`,
			contactLoginChanged: (name, oldLogin, newLogin) =>
				`${name} changed login: @${oldLogin} → @${newLogin}`,
			loginChangedRedirect: (oldLogin, newLogin) =>
				`This user changed login: @${oldLogin} → @${newLogin}`,
			displayNameLabel: 'Display name',
			emailLabel: 'Email',
			phoneLabel: 'Phone',
			photoLabel: 'Profile photo',
			editAvatar: 'Edit',
			profileDetailsTitle: 'Email and phone',
			accountTab: 'Account',
			securityTab: 'Security',
			appearanceTab: 'Appearance',
			chatSettingsTab: 'Chat settings',
			sendOnEnter: 'Send on Enter',
			sendOnEnterHint: 'Enter sends the message, Shift+Enter adds a new line',
			foldersTab: 'Folders',
			aboutAppTab: 'About',
			debugLogButton: 'Debug',
			debugLogTitle: 'Load log',
			debugLogCopy: 'Copy',
			debugLogClear: 'Clear',
			debugLogClose: 'Close',
			debugLogEmpty: 'No entries yet',
			debugLogCopied: 'Copied',
			helpTab: 'Help',
			changelogTitle: 'Changelog',
			contentEmpty: 'No content configured',
			aboutMeLabel: 'About me',
			aboutMePlaceholder: 'Tell others about yourself (up to 140 characters)',
			statusTextHint: 'Up to 20 characters',
			changePhoto: 'Change photo',
			saveProfile: 'Save',
			changePassword: 'Change password',
			passwordSectionLogin: 'Login password',
			passwordSectionMaster: 'Encryption master password',
			masterPasswordHint: 'Not stored on server. Required to decrypt messages.',
			masterSameAsLogin: 'Master password matches login password',
			masterSameAsLoginHint: 'Your login password is used for encryption.',
			enterLoginPasswordToMerge: 'Enter your current login password above',
			currentPassword: 'Current login password',
			newPassword: 'New login password',
			currentMasterPassword: 'Current master password',
			newMasterPassword: 'New master password',
			repeatMasterPassword: 'Repeat new master password',
			changeMasterPassword: 'Change master password',
			setupMasterPassword: 'Set up master password',
			saved: 'Saved',
			appSettings: 'App settings',
			loadProfileError: 'Failed to load profile',
			privacy: 'Privacy',
			searchableByLogin: 'Allow search by login',
			searchableByName: 'Allow search by display name',
			allowInviteLabel: 'Invite to chat',
			showOnlineStatusLabel: 'See online status',
			allowWriteLabel: 'Who can write',
			privacyEveryone: 'Everyone',
			privacyContacts: 'Contacts',
			save: 'Save',
			archiveFolder: 'Archive',
			openArchive: 'Open archive',
			writeMessageBtn: 'Write',
			savePrivacy: 'Save privacy settings',
			statusTextLabel: 'Status',
			statusTextPlaceholder: 'Status…',
			searchContactsHint: 'Type a name or login to search',
			filterContactsHint: 'Search your contacts',
			searchMinChars: 'Enter at least 4 characters',
			clearCache: 'Clear message cache',
			clearAllCache: 'Clear all cache',
			notifications: 'Notifications',
			notificationsEnableTitle: 'Enable notifications?',
			notificationsEnableMsg: 'You will receive push notifications about new messages when the app is minimized or closed. The notification shows the sender name or group name; the message text is not sent due to end-to-end encryption.',
			notificationsDisableTitle: 'Disable notifications?',
			notificationsDisableMsg: 'Push notifications will no longer arrive on this device.',
			notificationsEnabledOk: 'Notifications enabled',
			notificationsDisabledOk: 'Notifications disabled',
			notificationsDenied: 'Notifications are blocked in the browser. Allow them for this site in settings and try again.',
			notificationsUnsupported: 'Notifications are not available in this browser or mode (HTTPS and app installation required).',
			notificationsFailed: 'Could not enable notifications. Please try again later.',
			muteNotifications: 'Mute notifications',
			unmuteNotifications: 'Unmute notifications',
			clearCacheConfirmTitle: 'Clear message cache?',
			clearCacheConfirmMsg: 'Messages will be reloaded from the server. Images will be kept.',
			clearAllConfirmTitle: 'Clear all cache?',
			clearAllConfirmMsg: 'All cached data including images will be removed.',
			cacheCleared: 'Cache cleared',
			tokenChanged: 'Session updated. Reloading messages…',
			networkOffline: 'No connection',
			networkOfflineMsg: 'Could not connect to the server. Check your internet and refresh the page.',
			confirm: 'Confirm',
			cancel: 'Cancel',
			back: 'Back',
			themeLight: 'Light',
			themeDark: 'Dark',
			showProfile: 'Profile',
			groupProfile: 'Group',
			groupMembers: 'Members',
			groupAddMembers: 'Add members',
			groupCreator: 'Creator',
			groupAdmin: 'Admin',
			groupNameLabel: 'Group name',
			grantAdmin: 'Make admin',
			revokeAdmin: 'Revoke admin',
			grantAdminConfirm: 'Make {name} an admin?',
			revokeAdminConfirm: 'Revoke admin rights from {name}?',
			removeMember: 'Remove from group',
			systemGroupRenamed: '{actor} renamed the group to «{name}»',
			systemGroupAvatarChanged: '{actor} changed the group photo',
			systemGroupAdminGranted: '{actor} made {target} an admin',
			systemGroupAdminRevoked: '{actor} revoked admin rights from {target}',
			changeGroupAvatar: 'Change group photo',
			avatarSourceTitle: 'Profile photo',
			avatarImageOnly: 'Please choose an image.',
			avatarFromFile: 'Upload from file',
			avatarFromCamera: 'Take a photo',
			avatarCropTitle: 'Edit photo',
			avatarCropHint: 'Drag and zoom — the circle shows how your avatar will look',
			avatarCropZoom: 'Zoom',
			avatarCropApply: 'Done',
			cameraTitle: 'Camera',
			cameraCapture: 'Capture',
			cameraSwitch: 'Switch camera',
			cameraRetry: 'Retry',
			cameraUnavailable: 'Camera is not available on this device or browser',
			cameraDenied: 'Could not access the camera. Allow access in your browser settings.',
			groupSaved: 'Saved',
			groupSaveError: 'Could not save',
			groupJoinByLink: 'Invite by link',
			groupJoinByLinkHint: 'Anyone with the link can join without being added by an admin',
			groupInviteLink: 'Group link',
			groupJoinTitle: 'Join group',
			groupJoinBtn: 'Join',
			groupJoinDisabled: 'Joining by link is disabled',
			groupJoinOpenChat: 'Open chat',
			clearHistory: 'Clear history',
			clearHistoryTitle: 'Clear history?',
			clearHistoryMsg: 'Messages will be permanently deleted.',
			alsoDeleteFor: (name) => `Also delete for ${name}`,
			deleteChat: 'Delete chat',
			deleteChatTitle: 'Delete chat?',
			deleteChatMsg: 'The chat and all messages will be deleted.',
			leaveGroup: 'Leave group',
			leaveGroupTitle: 'Leave group?',
			leaveGroupMsg: 'You will leave the group. If you are the last member, the group will be deleted.',
			blockUser: 'Block user',
			blockUserTitle: 'Block this user?',
			blockUserMsg: 'They will be removed from your contacts and cannot message you. Their messages will not be delivered.',
			blockGroup: 'Block group',
			blockGroupTitle: 'Block this group?',
			blockGroupMsg: 'You will leave the group. Messages will not be delivered; others can add you back only via invite link if enabled.',
			groupExcludedFromJoin: 'You were removed from this group and cannot join via link. Ask an admin to add you manually.',
			findInChat: 'Find',
			searchInChat: (name) => `Search: ${name}`,
			moveToFolder: 'Move to folder',
			createFolder: 'Create folder',
			createFolderTitle: 'New folder',
			folderNamePlaceholder: 'Folder name…',
			allChats: 'All chats',
			noFolders: 'No folders',
			folderSettings: 'Folders',
			folderSettingsHint: 'Drag to reorder. Click a name to rename.',
			folderRename: 'Rename',
			folderDeleteConfirm: 'Delete folder «{name}»?',
			folderDelete: 'Delete folder',
			folderIconLabel: 'Icon',
			folderIconChoose: 'Choose icon',
			folderIconPickerTitle: 'Folder icon',
			folderIconTabEmoji: 'Emoji',
			folderIconTabSvg: 'Icons',
			folderIconCustomEmoji: 'Custom symbol',
			lastSeen: 'Last seen',
			lastSeenNever: 'Has not been online for a long time',
			lastSeenJustNow: 'just now',
			lastSeenMinutesAgo: (n) => n === 1 ? '1 minute ago' : `${n} minutes ago`,
			lastSeenHourAgo: '1 hour ago',
			lastSeenTwoHoursAgo: '2 hours ago',
			onlineNow: 'Online',
			idleNow: 'Idle',
			typeLabels: {
				direct: 'direct message',
				group: 'group',
				public_group: 'public group',
			},
			sectionLabels: {
				direct: 'Direct Messages',
				group: 'Groups',
				public_group: 'Public Groups',
			},
			unnamed: '(unnamed)',
			activityLabels: {
				typing: (name) => `${name} is typing`,
				sendingFile: (name) => `${name} is sending a file`,
				sendingImage: (name) => `${name} is sending an image`,
			},
			activityLabelMany: (count) => `${count} people are typing`,
			msgActionEdit: 'Edit',
			msgActionReply: 'Reply',
			msgActionForward: 'Forward',
			msgActionCopy: 'Copy text',
			msgActionSelect: 'Select',
			msgActionDelete: 'Delete',
			deleteForMe: 'Delete for me',
			deleteForEveryone: 'Delete for everyone',
			deleteMessageTitle: 'Delete message?',
			deleteMessageMsg: 'The message will be permanently deleted.',
			forwardedFrom: (name) => `(from ${name})`,
			messageDeleted: 'Message deleted',
			edited: 'edited',
			editMessageTitle: 'Edit message',
			forwardTitle: 'Forward',
			forwardSend: 'Send',
			forwardMaxContacts: 'You can select up to 10 contacts',
			forwardNotAllowed: 'Protected or unavailable messages cannot be forwarded',
			forwardSearch: 'Search chats and contacts',
			forwardChatsNotFound: 'No chats found',
			textCopied: 'Text copied',
			selectMode: 'Selected',
			selectCancel: 'Cancel',
			selectDelete: 'Delete',
		},
	};

	#locale;
	#strings;

	constructor(locale = 'ru') {
		this.#locale = MessengerI18n.LOCALES[locale] ? locale : 'ru';
		this.#strings = MessengerI18n.LOCALES[this.#locale];
	}

	t(key, ...args) {
		const val = this.#strings[key];
		if (typeof val === 'function') return val(...args);
		return val ?? key;
	}

	tActivity(activityType, userName) {
		const labels = this.#strings.activityLabels;
		const fn = labels?.[activityType];
		if (typeof fn === 'function') return fn(userName);
		return `${userName}: ${activityType}`;
	}

	tActivityMany(count) {
		const fn = this.#strings.activityLabelMany;
		if (typeof fn === 'function') return fn(count);
		return `${count}`;
	}

	get locale() {
		return this.#locale;
	}
}

class MessengerIcons {
	pencil() {
		return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`;
	}
	chatBubble() {
		return `<svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`;
	}
	back() {
		return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>`;
	}
	dots() {
		return `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="12" cy="19" r="1.6"/></svg>`;
	}
	send() {
		return `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" clip-rule="evenodd" d="M3.3938 2.20468C3.70395 1.96828 4.12324 1.93374 4.4679 2.1162L21.4679 11.1162C21.7953 11.2895 22 11.6296 22 12C22 12.3704 21.7953 12.7105 21.4679 12.8838L4.4679 21.8838C4.12324 22.0662 3.70395 22.0317 3.3938 21.7953C3.08365 21.5589 2.93922 21.1637 3.02382 20.7831L4.97561 12L3.02382 3.21692C2.93922 2.83623 3.08365 2.44109 3.3938 2.20468ZM6.80218 13L5.44596 19.103L16.9739 13H6.80218ZM16.9739 11H6.80218L5.44596 4.89699L16.9739 11Z"/></svg>`;
	}
	check() {
		return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;
	}
	checkSingle() {
		return `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;
	}
	checkDouble() {
		return `<svg width="16" height="14" viewBox="0 0 28 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="14 6 9 17 4 12"/><polyline points="24 6 19 17 14 12"/></svg>`;
	}
	paperclip() {
		return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>`;
	}
	fileDoc() {
		return `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>`;
	}
	camera() {
		return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>`;
	}
	imageThumb() {
		return `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>`;
	}
	closeBig() {
		return `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
	}

	qrCode() {
		return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
			<rect x="3" y="3" width="7" height="7" rx="1"/>
			<rect x="5" y="5" width="3" height="3" fill="currentColor" stroke="none"/>
			<rect x="14" y="3" width="7" height="7" rx="1"/>
			<rect x="16" y="5" width="3" height="3" fill="currentColor" stroke="none"/>
			<rect x="3" y="14" width="7" height="7" rx="1"/>
			<rect x="5" y="16" width="3" height="3" fill="currentColor" stroke="none"/>
			<rect x="14" y="14" width="2" height="2" fill="currentColor" stroke="none"/>
			<rect x="17" y="14" width="2" height="2" fill="currentColor" stroke="none"/>
			<rect x="20" y="14" width="2" height="2" fill="currentColor" stroke="none"/>
			<rect x="14" y="17" width="2" height="2" fill="currentColor" stroke="none"/>
			<rect x="17" y="17" width="2" height="2" fill="currentColor" stroke="none"/>
			<rect x="20" y="17" width="2" height="2" fill="currentColor" stroke="none"/>
			<rect x="14" y="20" width="2" height="2" fill="currentColor" stroke="none"/>
			<rect x="17" y="20" width="2" height="2" fill="currentColor" stroke="none"/>
			<rect x="20" y="20" width="2" height="2" fill="currentColor" stroke="none"/>
			<rect x="11" y="11" width="2" height="2" fill="currentColor" stroke="none"/>
			<rect x="11" y="7" width="2" height="2" fill="currentColor" stroke="none"/>
		</svg>`;
	}

	copy() {
		return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`;
	}
	reply() {
		return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 17 4 12 9 7"/><path d="M20 18v-2a4 4 0 0 0-4-4H4"/></svg>`;
	}
	forward() {
		return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 17 20 12 15 7"/><path d="M4 12h16"/></svg>`;
	}
	select() {
		return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><polyline points="9 12 11 14 15 10"/></svg>`;
	}

	// --- Иконки для пунктов меню настроек ---

	/**
	 * Иконка "Тема" — солнце (смена темы оформления)
	 */
	theme() {
		return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
			<circle cx="12" cy="12" r="4"/>
			<line x1="12" y1="2"  x2="12" y2="4"/>
			<line x1="12" y1="20" x2="12" y2="22"/>
			<line x1="4.22" y1="4.22"   x2="5.64" y2="5.64"/>
			<line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
			<line x1="2"  y1="12" x2="4"  y2="12"/>
			<line x1="20" y1="12" x2="22" y2="12"/>
			<line x1="4.22"  y1="19.78" x2="5.64"  y2="18.36"/>
			<line x1="18.36" y1="5.64"  x2="19.78" y2="4.22"/>
		</svg>`;
	}

	/**
	 * Иконка "Очистить кеш" — стрелка обновления
	 */
	clearCache() {
		return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
			<polyline points="23 4 23 10 17 10"/>
			<polyline points="1 20 1 14 7 14"/>
			<path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
		</svg>`;
	}

	/**
	 * Иконка "Очистить всё" — мусорная корзина (danger-пункт)
	 */
	clearAll() {
		return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
			<polyline points="3 6 5 6 21 6"/>
			<path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
			<path d="M10 11v6M14 11v6"/>
			<path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
		</svg>`;
	}

	user() {
		return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`;
	}

	logout() {
		return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>`;
	}

	admin() {
		return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18M15 3v18M3 9h18M3 15h18"/></svg>`;
	}

	/**
	 * Иконка "Пустой кружок" — используется для неактивных пунктов подменю тем
	 */
	circleDot() {
		return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
			<circle cx="12" cy="12" r="9"/>
		</svg>`;
	}

	folder() {
		return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>`;
	}
	folderGray() {
		return `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#9aa0a6" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>`;
	}
	star() {
		return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`;
	}
	bookmark() {
		return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>`;
	}
	pin() {
		return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 17v5"/><path d="M5 7h14l-1 7H6L5 7z"/><path d="M9 7V2h6v5"/></svg>`;
	}
	bell() {
		return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>`;
	}
	bellOff() {
		return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13.73 21a2 2 0 0 1-3.46 0"/><path d="M18.63 13A17.89 17.89 0 0 1 18 8"/><path d="M6.26 6.26A5.86 5.86 0 0 0 6 8c0 7-3 9-3 9h14"/><path d="M18 8a6 6 0 0 0-9.33-5"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`;
	}
	heart() {
		return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`;
	}
	trash() {
		return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>`;
	}
	search() {
		return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`;
	}
	profile() {
		return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`;
	}
	groupUsers() {
		return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`;
	}
	eraser() {
		return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 20H7L3 16l10-10 7 7-3.5 3.5"/><path d="M6.5 17.5l3-3"/></svg>`;
	}
	exitGroup() {
		return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>`;
	}
	close() {
		return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
	}
	lock() {
		return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`;
	}
	lockClosedSmall() {
		return `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>`;
	}
	shieldBadge() {
		return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polygon points="12 7.5 13.8 11.5 18 12.1 15 14.8 15.8 19 12 16.8 8.2 19 9 14.8 6 12.1 10.2 11.5 12 7.5" fill="currentColor" stroke="none"/></svg>`;
	}
	block() {
		return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>`;
	}
	typingDots() {
		return `<span class="mc-typing-dots" aria-label="typing">
      <span></span><span></span><span></span>
    </span>
    <style>
      .mc-typing-dots { display:inline-flex; align-items:center; gap:3px; }
      .mc-typing-dots span {
        display:inline-block; width:5px; height:5px; border-radius:50%;
        background:currentColor; opacity:0.4;
        animation: mc-typing-bounce 1.2s infinite ease-in-out;
      }
      .mc-typing-dots span:nth-child(1) { animation-delay: 0s; }
      .mc-typing-dots span:nth-child(2) { animation-delay: 0.2s; }
      .mc-typing-dots span:nth-child(3) { animation-delay: 0.4s; }
      @keyframes mc-typing-bounce {
        0%, 60%, 100% { transform: translateY(0); opacity:0.4; }
        30%            { transform: translateY(-4px); opacity:1; }
      }
    </style>`;
	}
}

class MessengerAppContext {
	static getOrigin() {
		const appOrigin = (typeof App === 'object' && App && App.location && App.location.origin) ? App.location.origin : '';
		if (typeof appOrigin === 'string' && appOrigin.trim()) {
			return appOrigin.replace(/\/+$/, '');
		}
		return window.location.origin;
	}

	static getBpmCsrf() { return ""; }

	static toAbsoluteUrl(path) {
		const normalizedPath = path.startsWith('/') ? path : `/${path}`;
		return `${MessengerAppContext.getOrigin()}${normalizedPath}`;
	}
}

class MessengerFileService {
	static FILE_SCHEMA_ID = '5aecdf25-d1ab-46bf-9baa-ad45f9a367e2';

	static getFileUrl(fileId) {
		return MessengerAppContext.toAbsoluteUrl(`/api/files/${fileId}`);
	}
}

class MessengerTokenWatcher {
	#onChange;
	#intervalMs;
	#lastToken = null;
	#timerId = null;

	constructor(onChange, intervalMs = 5000) {
		this.#onChange = onChange;
		this.#intervalMs = intervalMs;
	}

	start() {
		this.#lastToken = this.#readToken();
		this.#timerId = setInterval(() => {
			const current = this.#readToken();
			if (this.#lastToken !== null && current !== this.#lastToken) {
				const oldToken = this.#lastToken;
				this.#lastToken = current;
				this.#onChange(current, oldToken);
			} else {
				this.#lastToken = current;
			}
		}, this.#intervalMs);
	}

	stop() {
		if (this.#timerId !== null) {
			clearInterval(this.#timerId);
			this.#timerId = null;
		}
	}

	getCurrent() {
		return this.#lastToken;
	}

	#readToken() {
		const token = MessengerAppContext.getBpmCsrf();
		return token || null;
	}
}

class MessengerDialog {
	static TYPE_INFO = 'info';
	static TYPE_WARNING = 'warning';
	static TYPE_DANGER = 'danger';
	static TYPE_SUCCESS = 'success';

	static #ICONS = {
		info: 'ℹ️',
		warning: '⚠️',
		danger: '🗑',
		success: '✓',
	};

	/** @returns {Promise<'primary'|'secondary'|null>} */
	static choose(options = {}) {
		const {
			title = '',
			message = '',
			primaryLabel = 'OK',
			secondaryLabel = '',
			cancelLabel = 'Cancel',
			themeManager = null,
		} = options;

		return new Promise((resolve) => {
			const overlay = document.createElement('div');
			overlay.className = 'mc-dialog-overlay';
			const dialog = document.createElement('div');
			dialog.className = 'mc-dialog';
			if (themeManager) themeManager.applyChatVars(dialog);

			if (title) {
				const titleEl = document.createElement('div');
				titleEl.className = 'mc-dialog-title';
				titleEl.textContent = title;
				dialog.appendChild(titleEl);
			}

			const msgEl = document.createElement('div');
			msgEl.className = 'mc-dialog-message';
			msgEl.textContent = message;

			const actions = document.createElement('div');
			actions.className = 'mc-dialog-actions mc-dialog-actions--stack';

			const primaryBtn = document.createElement('button');
			primaryBtn.className = 'mc-dialog-btn mc-dialog-btn--confirm';
			primaryBtn.textContent = primaryLabel;

			const secondaryBtn = document.createElement('button');
			secondaryBtn.className = 'mc-dialog-btn mc-dialog-btn--cancel';
			secondaryBtn.textContent = secondaryLabel;

			const cancelBtn = document.createElement('button');
			cancelBtn.className = 'mc-dialog-btn mc-dialog-btn--cancel';
			cancelBtn.textContent = cancelLabel;

			dialog.append(msgEl, actions);
			if (secondaryLabel) actions.append(primaryBtn, secondaryBtn, cancelBtn);
			else actions.append(primaryBtn, cancelBtn);
			overlay.appendChild(dialog);
			document.body.appendChild(overlay);

			const close = messengerMakeDismissable((result) => {
				overlay.remove();
				resolve(result);
			}, null);

			primaryBtn.addEventListener('click', () => close('primary'));
			if (secondaryLabel) secondaryBtn.addEventListener('click', () => close('secondary'));
			cancelBtn.addEventListener('click', () => close(null));
			overlay.addEventListener('click', (e) => { if (e.target === overlay) close(null); });
			document.addEventListener('keydown', function handler(e) {
				if (e.key === 'Escape') { document.removeEventListener('keydown', handler); close(null); }
			});
		});
	}

	static confirm(options = {}) {
		const {
			title = '',
			message = '',
			type = MessengerDialog.TYPE_WARNING,
			confirmLabel = 'OK',
			cancelLabel = 'Cancel',
			themeManager = null,
		} = options;

		return new Promise((resolve) => {
			const overlay = document.createElement('div');
			overlay.className = 'mc-dialog-overlay';

			const dialog = document.createElement('div');
			dialog.className = 'mc-dialog';

			if (themeManager) themeManager.applyChatVars(dialog);

			const iconEl = document.createElement('div');
			iconEl.className = `mc-dialog-icon mc-dialog-icon--${type}`;
			iconEl.textContent = MessengerDialog.#ICONS[type] ?? '❓';

			const titleEl = document.createElement('div');
			titleEl.className = 'mc-dialog-title';
			titleEl.textContent = title;

			const msgEl = document.createElement('div');
			msgEl.className = 'mc-dialog-message';
			msgEl.textContent = message;

			const actions = document.createElement('div');
			actions.className = 'mc-dialog-actions';

			const cancelBtn = document.createElement('button');
			cancelBtn.className = 'mc-dialog-btn mc-dialog-btn--cancel';
			cancelBtn.textContent = cancelLabel;

			const confirmBtn = document.createElement('button');
			confirmBtn.className = `mc-dialog-btn ${type === MessengerDialog.TYPE_DANGER ? 'mc-dialog-btn--danger' : 'mc-dialog-btn--confirm'}`;
			confirmBtn.textContent = confirmLabel;

			actions.append(cancelBtn, confirmBtn);

			if (title) dialog.appendChild(titleEl);
			dialog.append(msgEl, actions);
			overlay.appendChild(dialog);
			document.body.appendChild(overlay);

			const close = messengerMakeDismissable((result) => {
				overlay.remove();
				resolve(result);
			}, false);

			confirmBtn.addEventListener('click', () => close(true));
			cancelBtn.addEventListener('click', () => close(false));
			overlay.addEventListener('click', (e) => { if (e.target === overlay) close(false); });
			document.addEventListener('keydown', function handler(e) {
				if (e.key === 'Escape') { document.removeEventListener('keydown', handler); close(false); }
			});
		});
	}

	static confirmWithCheckbox(options = {}) {
		const {
			title = '',
			message = '',
			type = MessengerDialog.TYPE_WARNING,
			confirmLabel = 'OK',
			cancelLabel = 'Cancel',
			checkboxLabel = '',
			themeManager = null,
		} = options;

		return new Promise((resolve) => {
			const overlay = document.createElement('div');
			overlay.className = 'mc-dialog-overlay';
			const dialog = document.createElement('div');
			dialog.className = 'mc-dialog';
			if (themeManager) themeManager.applyChatVars(dialog);

			const titleEl = document.createElement('div');
			titleEl.className = 'mc-dialog-title';
			titleEl.textContent = title;

			const msgEl = document.createElement('div');
			msgEl.className = 'mc-dialog-message';
			msgEl.textContent = message;

			const chkWrap = document.createElement('label');
			chkWrap.className = 'mc-dialog-checkbox-wrap';
			const chkInput = document.createElement('input');
			chkInput.type = 'checkbox';
			const chkLabel = document.createElement('span');
			chkLabel.textContent = checkboxLabel;
			chkWrap.append(chkInput, chkLabel);

			const actions = document.createElement('div');
			actions.className = 'mc-dialog-actions';
			const cancelBtn = document.createElement('button');
			cancelBtn.className = 'mc-dialog-btn mc-dialog-btn--cancel';
			cancelBtn.textContent = cancelLabel;
			const confirmBtn = document.createElement('button');
			confirmBtn.className = `mc-dialog-btn ${type === MessengerDialog.TYPE_DANGER ? 'mc-dialog-btn--danger' : 'mc-dialog-btn--confirm'}`;
			confirmBtn.textContent = confirmLabel;
			actions.append(cancelBtn, confirmBtn);

			if (title) dialog.appendChild(titleEl);
			dialog.append(msgEl, chkWrap, actions);
			overlay.appendChild(dialog);
			document.body.appendChild(overlay);

			const close = messengerMakeDismissable((result) => { overlay.remove(); resolve(result); }, null);
			confirmBtn.addEventListener('click', () => close({ confirmed: true, checked: chkInput.checked }));
			cancelBtn.addEventListener('click', () => close(null));
			overlay.addEventListener('click', (e) => { if (e.target === overlay) close(null); });
			document.addEventListener('keydown', function handler(e) {
				if (e.key === 'Escape') { document.removeEventListener('keydown', handler); close(null); }
			});
		});
	}

	static alert(options = {}) {
		const {
			title = '',
			message = '',
			type = MessengerDialog.TYPE_INFO,
			confirmLabel = 'OK',
			themeManager = null,
		} = options;

		return new Promise((resolve) => {
			const overlay = document.createElement('div');
			overlay.className = 'mc-dialog-overlay';

			const dialog = document.createElement('div');
			dialog.className = 'mc-dialog';

			if (themeManager) themeManager.applyChatVars(dialog);

			const iconEl = document.createElement('div');
			iconEl.className = `mc-dialog-icon mc-dialog-icon--${type}`;
			iconEl.textContent = MessengerDialog.#ICONS[type] ?? 'ℹ️';

			const titleEl = document.createElement('div');
			titleEl.className = 'mc-dialog-title';
			titleEl.textContent = title;

			const msgEl = document.createElement('div');
			msgEl.className = 'mc-dialog-message';
			msgEl.textContent = message;

			const actions = document.createElement('div');
			actions.className = 'mc-dialog-actions';

			const confirmBtn = document.createElement('button');
			confirmBtn.className = 'mc-dialog-btn mc-dialog-btn--confirm';
			confirmBtn.textContent = confirmLabel;

			actions.appendChild(confirmBtn);

			if (title) dialog.appendChild(titleEl);
			dialog.append(iconEl, msgEl, actions);
			overlay.appendChild(dialog);
			document.body.appendChild(overlay);

			const close = messengerMakeDismissable(() => { overlay.remove(); resolve(); }, undefined);

			confirmBtn.addEventListener('click', () => close());
			overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
			document.addEventListener('keydown', function handler(e) {
				if (e.key === 'Escape') { document.removeEventListener('keydown', handler); close(); }
			});
		});
	}

	/**
	 * Simple notice with one button. Closes on button click; optional callback runs before close.
	 * @param {string} message
	 * @param {string} [buttonLabel='OK']
	 * @param {(() => void)|null} [onButtonClick]
	 * @param {MessengerThemeManager|null} [themeManager]
	 */
	static showNotice(message, buttonLabel = 'OK', onButtonClick = null, themeManager = null) {
		return new Promise((resolve) => {
			const overlay = document.createElement('div');
			overlay.className = 'mc-dialog-overlay';

			const dialog = document.createElement('div');
			dialog.className = 'mc-dialog';

			if (themeManager) themeManager.applyChatVars(dialog);

			const msgEl = document.createElement('div');
			msgEl.className = 'mc-dialog-message';
			msgEl.textContent = message;

			const actions = document.createElement('div');
			actions.className = 'mc-dialog-actions';

			const actionBtn = document.createElement('button');
			actionBtn.className = 'mc-dialog-btn mc-dialog-btn--confirm';
			actionBtn.textContent = buttonLabel;

			actions.appendChild(actionBtn);
			dialog.append(msgEl, actions);
			overlay.appendChild(dialog);
			document.body.appendChild(overlay);

			const close = messengerMakeDismissable(() => { overlay.remove(); resolve(); }, undefined);

			actionBtn.addEventListener('click', () => {
				if (typeof onButtonClick === 'function') {
					try { onButtonClick(); } catch (e) { console.error('[MessengerDialog.showNotice]', e); }
				}
				close();
			});
			document.addEventListener('keydown', function handler(e) {
				if (e.key === 'Escape') { document.removeEventListener('keydown', handler); close(); }
			});
		});
	}

	static openHtmlModal(options = {}) {
		const {
			title = '',
			html = '',
			confirmLabel = 'OK',
			themeManager = null,
		} = options;

		return new Promise((resolve) => {
			const overlay = document.createElement('div');
			overlay.className = 'mc-dialog-overlay';

			const dialog = document.createElement('div');
			dialog.className = 'mc-dialog mc-dialog--html';
			if (themeManager) themeManager.applyChatVars(dialog);

			if (title) {
				const titleEl = document.createElement('div');
				titleEl.className = 'mc-dialog-title';
				titleEl.textContent = title;
				dialog.appendChild(titleEl);
			}

			const bodyEl = document.createElement('div');
			bodyEl.className = 'mc-dialog-html-body mapp-app-html-content mapp-selectable-text';
			bodyEl.innerHTML = sanitizeAppHtml(html);

			const actions = document.createElement('div');
			actions.className = 'mc-dialog-actions';
			const confirmBtn = document.createElement('button');
			confirmBtn.className = 'mc-dialog-btn mc-dialog-btn--confirm';
			confirmBtn.textContent = confirmLabel;
			actions.appendChild(confirmBtn);

			dialog.append(bodyEl, actions);
			overlay.appendChild(dialog);
			document.body.appendChild(overlay);

			const close = messengerMakeDismissable(() => {
				overlay.remove();
				resolve();
			}, undefined);
			confirmBtn.addEventListener('click', () => close());
			overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
			document.addEventListener('keydown', function handler(e) {
				if (e.key === 'Escape') {
					document.removeEventListener('keydown', handler);
					close();
				}
			});
		});
	}

	static #passwordEyeSvg() {
		return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
			<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
			<circle cx="12" cy="12" r="3"/>
		</svg>`;
	}

	static #passwordEyeOffSvg() {
		return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
			<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
			<path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
			<line x1="1" y1="1" x2="23" y2="23"/>
		</svg>`;
	}

	static applyStealthPasswordInput(input) {
		input.type = 'text';
		input.setAttribute('autocomplete', 'off');
		input.setAttribute('autocorrect', 'off');
		input.setAttribute('autocapitalize', 'off');
		input.setAttribute('spellcheck', 'false');
		input.setAttribute('data-lpignore', 'true');
		input.setAttribute('data-1p-ignore', 'true');
		input.setAttribute('data-form-type', 'other');
		input.setAttribute('inputmode', 'text');
		input.name = 'sm-field-' + Math.random().toString(36).slice(2);
		input.dataset.smHidden = '1';
		input.classList.add('mc-dialog-input--masked');
	}

	static setPasswordVisible(input, visible) {
		if (!input) return;
		input.classList.toggle('mc-dialog-input--masked', !visible);
		input.dataset.smHidden = visible ? '0' : '1';
	}

	static createPasswordField({ placeholder = '', minLength = 6, required = true } = {}) {
		const wrap = document.createElement('div');
		wrap.className = 'mc-password-field';
		const input = MessengerDialog.#mkDialogInput(placeholder);
		if (minLength > 0) input.minLength = minLength;
		if (required) input.required = true;
		MessengerDialog.applyStealthPasswordInput(input);
		const toggle = document.createElement('button');
		toggle.type = 'button';
		toggle.className = 'mc-password-toggle';
		toggle.setAttribute('aria-label', 'Показать пароль');
		toggle.innerHTML = MessengerDialog.#passwordEyeSvg();
		let visible = false;
		toggle.addEventListener('click', () => {
			visible = !visible;
			MessengerDialog.setPasswordVisible(input, visible);
			toggle.innerHTML = visible
				? MessengerDialog.#passwordEyeOffSvg()
				: MessengerDialog.#passwordEyeSvg();
			toggle.setAttribute('aria-label', visible ? 'Скрыть пароль' : 'Показать пароль');
		});
		wrap.append(input, toggle);
		return { wrap, input, toggle };
	}

	static validatePasswordLength(password, minLength, label = 'Пароль') {
		if (!password || password.length < minLength) {
			return `${label}: минимум ${minLength} символов`;
		}
		return null;
	}

	static #mkDialogInput(placeholder = '') {
		const input = document.createElement('input');
		input.className = 'mc-dialog-input';
		applyStandardFieldInput(input);
		input.placeholder = placeholder;
		return input;
	}

	static prompt(options = {}) {
		const {
			title = '',
			message = '',
			placeholder = '',
			confirmLabel = 'OK',
			cancelLabel = 'Cancel',
			type = 'text',
			themeManager = null,
		} = options;

		return new Promise((resolve) => {
			const overlay = document.createElement('div');
			overlay.className = 'mc-dialog-overlay';
			const dialog = document.createElement('div');
			dialog.className = 'mc-dialog';
			if (themeManager) themeManager.applyChatVars(dialog);

			if (title) {
				const titleEl = document.createElement('div');
				titleEl.className = 'mc-dialog-title';
				titleEl.textContent = title;
				dialog.appendChild(titleEl);
			}
			if (message) {
				const msgEl = document.createElement('div');
				msgEl.className = 'mc-dialog-message';
				msgEl.textContent = message;
				dialog.appendChild(msgEl);
			}
			let input;
			if (type === 'password') {
				const field = MessengerDialog.createPasswordField({ placeholder, minLength: 0, required: false });
				dialog.appendChild(field.wrap);
				input = field.input;
			} else {
				input = MessengerDialog.#mkDialogInput(placeholder);
				input.type = type;
				dialog.appendChild(input);
			}

			const actions = document.createElement('div');
			actions.className = 'mc-dialog-actions';
			const cancelBtn = document.createElement('button');
			cancelBtn.className = 'mc-dialog-btn mc-dialog-btn--cancel';
			cancelBtn.textContent = cancelLabel;
			const confirmBtn = document.createElement('button');
			confirmBtn.className = 'mc-dialog-btn mc-dialog-btn--confirm';
			confirmBtn.textContent = confirmLabel;
			actions.append(cancelBtn, confirmBtn);
			dialog.appendChild(actions);
			overlay.appendChild(dialog);
			document.body.appendChild(overlay);
			input.focus();

			const close = messengerMakeDismissable((val) => { overlay.remove(); resolve(val); }, null);
			confirmBtn.addEventListener('click', () => close(input.value));
			cancelBtn.addEventListener('click', () => close(null));
			overlay.addEventListener('click', (e) => { if (e.target === overlay) close(null); });
			input.addEventListener('keydown', (e) => {
				if (e.key === 'Enter') { e.preventDefault(); close(input.value); }
			});
		});
	}

	static promptPassword(options = {}) {
		const {
			title = '',
			message = '',
			placeholder = '',
			confirmLabel = 'OK',
			cancelLabel = 'Cancel',
			minLength = SupraAuthCrypto?.GROUP_EXTRA_MIN_LENGTH ?? 4,
			passwordLabel = 'Пароль',
			themeManager = null,
		} = options;

		return new Promise((resolve) => {
			const overlay = document.createElement('div');
			overlay.className = 'mc-dialog-overlay';
			const dialog = document.createElement('div');
			dialog.className = 'mc-dialog mc-dialog--form';
			if (themeManager) themeManager.applyChatVars(dialog);

			if (title) {
				const titleEl = document.createElement('div');
				titleEl.className = 'mc-dialog-title';
				titleEl.textContent = title;
				dialog.appendChild(titleEl);
			}
			if (message) {
				const msgEl = document.createElement('div');
				msgEl.className = 'mc-dialog-message';
				msgEl.textContent = message;
				dialog.appendChild(msgEl);
			}
			const errEl = document.createElement('div');
			errEl.className = 'mc-dialog-inline-err';
			errEl.hidden = true;
			const field = MessengerDialog.createPasswordField({ placeholder, minLength });
			dialog.append(field.wrap, errEl);

			const actions = document.createElement('div');
			actions.className = 'mc-dialog-actions';
			const cancelBtn = document.createElement('button');
			cancelBtn.className = 'mc-dialog-btn mc-dialog-btn--cancel';
			cancelBtn.textContent = cancelLabel;
			const confirmBtn = document.createElement('button');
			confirmBtn.className = 'mc-dialog-btn mc-dialog-btn--confirm';
			confirmBtn.textContent = confirmLabel;
			actions.append(cancelBtn, confirmBtn);
			dialog.appendChild(actions);
			overlay.appendChild(dialog);
			document.body.appendChild(overlay);
			field.input.focus();

			const close = messengerMakeDismissable((val) => { overlay.remove(); resolve(val); }, null);
			const submit = () => {
				const lenErr = MessengerDialog.validatePasswordLength(
					field.input.value, minLength, passwordLabel);
				if (lenErr) {
					errEl.textContent = lenErr;
					errEl.hidden = false;
					return;
				}
				errEl.hidden = true;
				close(field.input.value);
			};
			confirmBtn.addEventListener('click', submit);
			cancelBtn.addEventListener('click', () => close(null));
			overlay.addEventListener('click', (e) => { if (e.target === overlay) close(null); });
			field.input.addEventListener('keydown', (e) => {
				if (e.key === 'Enter') { e.preventDefault(); submit(); }
			});
		});
	}

	/** @deprecated use promptPassword */
	static promptPasswordPair(options = {}) {
		return MessengerDialog.promptPassword(options).then((pwd) =>
			pwd ? { pwd, pwd2: pwd } : null);
	}
}

class MessengerMenuBuilder {
	#utils;
	#i18n;
	#themeManager;

	constructor(utils, i18n, themeManager) {
		this.#utils = utils;
		this.#i18n = i18n;
		this.#themeManager = themeManager;
	}

		buildMenu(items, rootEl) {
		const menu = document.createElement('div');
		menu.className = 'mc-action-menu';
		this.#themeManager.applyChatVars(menu);
		if (rootEl) this.#themeManager.applyChatVars(rootEl);
		items.forEach(def => menu.appendChild(this.#buildItem(def)));
		return menu;
	}

	buildWindow(title, contentEl, onClose, options = {}) {
		const panel = document.createElement('div');
		panel.className = 'mc-panel-window';

		const header = document.createElement('div');
		header.className = 'mc-panel-window-header';

		if (title) {
			if (options.profileLink) {
				const titleRow = document.createElement('div');
				titleRow.className = 'mc-panel-window-title-row';
				const qrBtn = createProfileQrButton({
					link: options.profileLink,
					qrTitle: options.qrTitle,
					icons: options.icons,
					i18n: options.i18n,
					themeManager: options.themeManager,
				});
				const titleEl = document.createElement('div');
				titleEl.className = 'mc-panel-window-title';
				titleEl.textContent = title;
				if (qrBtn) titleRow.appendChild(qrBtn);
				titleRow.appendChild(titleEl);
				header.appendChild(titleRow);
			} else {
				const titleEl = document.createElement('div');
				titleEl.className = 'mc-panel-window-title';
				titleEl.textContent = title;
				header.appendChild(titleEl);
			}
		}

		const closeBtn = document.createElement('button');
		closeBtn.className = 'mc-panel-window-close';
		closeBtn.innerHTML = '&times;';
		closeBtn.addEventListener('click', onClose);
		header.appendChild(closeBtn);

		const body = document.createElement('div');
		body.className = 'mc-panel-window-body';
		body.appendChild(contentEl);

		panel.append(header, body);
		return panel;
	}

	openInOverlay(windowEl, overlayClass = '', { mobileFullscreen = false } = {}) {
		const overlay = document.createElement('div');
		overlay.className = `mapp-modal-overlay${overlayClass ? ' ' + overlayClass : ''}`;
		if (mobileFullscreen) applyMobileFullscreenOverlay(overlay);
		overlay.appendChild(windowEl);

		const close = () => {
			unlockAppScroll();
			overlay.remove();
		};
		lockAppScroll();
		if (!overlay.classList.contains('mapp-modal-overlay--fullscreen')) {
			overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
		}
		document.body.appendChild(overlay);
		return close;
	}

	#buildItem(def) {
		const item = document.createElement('div');
		item.className = 'mc-action-menu-item';
		if (def.danger) item.classList.add('mc-action-menu-item--danger');
		if (def.submenu?.length) item.classList.add('mc-action-menu-item--has-submenu');
		if (def.active) item.classList.add('mc-action-menu-item--active');
		if (def.id) item.dataset.menuItemId = def.id;

		if (def.icon) {
			const iconWrap = document.createElement('span');
			iconWrap.className = 'mc-action-menu-item-icon';
			iconWrap.innerHTML = def.icon;
			item.appendChild(iconWrap);
		}

		const label = document.createElement('span');
		label.textContent = this.#i18n ? this.#i18n.t(def.labelKey) || def.labelKey : def.labelKey;
		item.appendChild(label);

		if (def.submenu?.length) {
			if (isMobileSheetMenu()) {
				item.addEventListener('click', (e) => {
					e.stopPropagation();
					MobileBottomSheetMenu.open({
						title: label.textContent,
						items: this.#menuDefToSheetItems(def.submenu),
						themeManager: this.#themeManager,
						i18n: this.#i18n,
					});
				});
			} else {
				const submenu = this.#buildSubmenu(def.submenu);
				item.appendChild(submenu);

				item.addEventListener('click', (e) => {
					e.stopPropagation();
					const isOpen = item.classList.contains('mc-action-menu-item--open');
					if (isOpen) {
						item.classList.remove('mc-action-menu-item--open');
						submenu.classList.remove('mc-action-submenu--open');
						submenu.style.maxHeight = '0';
					} else {
						item.classList.add('mc-action-menu-item--open');
						submenu.classList.add('mc-action-submenu--open');
						submenu.style.maxHeight = submenu.scrollHeight + 'px';
					}
				});
			}
		} else if (typeof def.action === 'function') {
			item.addEventListener('click', (e) => {
				e.stopPropagation();
				def.action();
			});
		}

		return item;
	}

	#buildSubmenu(items) {
		const submenu = document.createElement('div');
		submenu.className = 'mc-action-submenu';
		submenu.classList.add('mc-submenu-accordion');
		submenu.style.maxHeight = '0';
		items.forEach(def => submenu.appendChild(this.#buildItem(def)));
		return submenu;
	}

	#menuDefToSheetItems(items) {
		return items.map(def => ({
			label: this.#i18n ? this.#i18n.t(def.labelKey) || def.labelKey : def.labelKey,
			icon: def.icon,
			danger: def.danger,
			active: def.active,
			action: def.action,
			children: def.submenu?.length ? this.#menuDefToSheetItems(def.submenu) : undefined,
		}));
	}
}

function lockAppScroll() {
	document.body.classList.add('mapp-scroll-lock');
}
function unlockAppScroll() {
	document.body.classList.remove('mapp-scroll-lock');
}

function attachMenuDismiss(menuEl, onDismiss) {
	let removeListeners = () => {};
	const dismiss = (e) => {
		if (menuEl.isConnected && menuEl.contains(e.target)) return;
		e.preventDefault();
		e.stopPropagation();
		e.stopImmediatePropagation?.();
		onDismiss();
		removeListeners();
	};
	removeListeners = () => {
		document.removeEventListener('mousedown', dismiss, true);
		document.removeEventListener('touchstart', dismiss, true);
		window.removeEventListener('blur', dismiss);
	};
	setTimeout(() => {
		document.addEventListener('mousedown', dismiss, true);
		document.addEventListener('touchstart', dismiss, true);
		window.addEventListener('blur', dismiss);
	}, 0);
	return removeListeners;
}

const MESSENGER_SHEET_BACK_SVG = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>`;
const MESSENGER_SHEET_CHECK_SVG = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;

function isMobileSheetMenu() {
	return window.innerWidth <= 1199;
}

function isSvgLogoUrl(url) {
	if (!url || typeof url !== 'string') return false;
	const s = url.trim();
	return /\.svg(\?|#|$)/i.test(s) || /^data:image\/svg\+xml/i.test(s);
}

function isThemedSvgLogo(branding) {
	if (!branding) return false;
	if (branding.logoSvg === true) return true;
	return isSvgLogoUrl(branding.logoUrl);
}

function cssMaskUrl(url) {
	return `url("${String(url).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}")`;
}

function createThemedSvgLogoEl(logoUrl, alt = '', { maxHeight = 34, maxWidth = 100, className = 'mapp-app-logo' } = {}) {
	const el = document.createElement('span');
	el.className = `${className} mapp-app-logo--svg-themed`;
	el.setAttribute('role', 'img');
	if (alt) el.setAttribute('aria-label', alt);
	el.style.setProperty('--mapp-logo-mask', cssMaskUrl(logoUrl));
	el.style.height = `${maxHeight}px`;
	el.style.maxWidth = `${maxWidth}px`;

	const probe = new Image();
	probe.onload = () => {
		if (probe.naturalWidth > 0 && probe.naturalHeight > 0) {
			const w = Math.min(maxWidth, Math.round(maxHeight * (probe.naturalWidth / probe.naturalHeight)));
			el.style.width = `${w}px`;
		}
	};
	probe.src = logoUrl;
	return el;
}

function upgradeLogoToThemedSvgIfNeeded(logoEl, branding, onUpgraded = null) {
	if (!logoEl || !branding?.logoUrl || isThemedSvgLogo(branding)) return;
	if (logoEl.classList?.contains('mapp-app-logo--svg-themed')) return;
	fetch(branding.logoUrl, { method: 'HEAD', credentials: 'same-origin' })
		.then((r) => {
			if (!r.ok) return;
			const ct = (r.headers.get('content-type') || '').toLowerCase();
			if (!ct.includes('svg')) return;
			branding.logoSvg = true;
			if (!logoEl.isConnected) return;
			const themed = createThemedSvgLogoEl(
				branding.logoUrl,
				branding.appName || logoEl.getAttribute('aria-label') || logoEl.alt || '',
			);
			if (logoEl.classList.contains('mapp-app-logo--clickable')) {
				themed.classList.add('mapp-app-logo--clickable');
			}
			logoEl.replaceWith(themed);
			onUpgraded?.(themed);
		})
		.catch(() => {});
}

function isMobileFullscreenModal() {
	return window.innerWidth <= 680;
}

function applyMobileFullscreenOverlay(overlayEl) {
	if (isMobileFullscreenModal()) {
		overlayEl.classList.add('mapp-modal-overlay--fullscreen');
	}
}

class MobileBottomSheetMenu {
	static #active = null;

	static isOpen() {
		return !!MobileBottomSheetMenu.#active;
	}

	/** fromUser=true closes via history (back), false tears down immediately. */
	static close(fromUser = true) {
		const a = MobileBottomSheetMenu.#active;
		if (!a) return;
		if (fromUser) a.requestClose();
		else a.teardown();
	}

	static closeFromPopstate() {
		const a = MobileBottomSheetMenu.#active;
		if (!a) return false;
		a.teardown();
		return true;
	}

	static open({ title = '', items = [], themeManager = null, i18n = null, icons = null, onClose = null, onSheetReady = null }) {
		MobileBottomSheetMenu.close(false);

		const overlay = document.createElement('div');
		overlay.className = 'mapp-sheet-overlay';
		const sheet = document.createElement('div');
		sheet.className = 'mapp-bottom-sheet';
		if (themeManager) themeManager.applyChatVars(sheet);

		const stack = [{ title, items: items.slice() }];
		let removeDismiss = () => {};
		let historyPushed = false;
		let pendingAction = null;

		const render = () => {
			const level = stack[stack.length - 1];
			sheet.replaceChildren();

			const handle = document.createElement('div');
			handle.className = 'mapp-sheet-handle';

			const header = document.createElement('div');
			header.className = 'mapp-sheet-header';

			if (stack.length > 1) {
				const backBtn = document.createElement('button');
				backBtn.type = 'button';
				backBtn.className = 'mapp-sheet-back';
				backBtn.innerHTML = icons?.back?.() || MESSENGER_SHEET_BACK_SVG;
				backBtn.title = i18n?.t('back') || 'Back';
				backBtn.setAttribute('aria-label', backBtn.title);
				backBtn.addEventListener('click', () => {
					stack.pop();
					render();
				});
				header.appendChild(backBtn);
			}

			if (level.title) {
				const titleEl = document.createElement('div');
				titleEl.className = 'mapp-sheet-title';
				titleEl.textContent = level.title;
				header.appendChild(titleEl);
			}

			const list = document.createElement('div');
			list.className = 'mapp-sheet-list';

			level.items.forEach(itemDef => {
				if (itemDef.hint) {
					const row = document.createElement('div');
					row.className = 'mapp-sheet-item mapp-sheet-item--hint';
					const lbl = document.createElement('span');
					lbl.className = 'mapp-sheet-item-label';
					lbl.textContent = itemDef.label;
					row.appendChild(lbl);
					list.appendChild(row);
					return;
				}

				const row = document.createElement('button');
				row.type = 'button';
				row.className = 'mapp-sheet-item';
				if (itemDef.danger) row.classList.add('mapp-sheet-item--danger');
				if (itemDef.active) row.classList.add('mapp-sheet-item--active');

				if (itemDef.icon) {
					const iconWrap = document.createElement('span');
					iconWrap.className = 'mapp-sheet-item-icon';
					iconWrap.innerHTML = itemDef.icon;
					row.appendChild(iconWrap);
				}

				const lbl = document.createElement('span');
				lbl.className = 'mapp-sheet-item-label';
				lbl.textContent = itemDef.label;
				row.appendChild(lbl);

				if (itemDef.active && !itemDef.children?.length) {
					const checkWrap = document.createElement('span');
					checkWrap.className = 'mapp-sheet-item-check';
					checkWrap.innerHTML = icons?.check?.() || MESSENGER_SHEET_CHECK_SVG;
					row.appendChild(checkWrap);
				}

				if (itemDef.children?.length) {
					const arrow = document.createElement('span');
					arrow.className = 'mapp-sheet-item-arrow';
					arrow.textContent = '›';
					row.appendChild(arrow);
				}

				row.addEventListener('click', () => {
					if (itemDef.children?.length) {
						stack.push({ title: itemDef.label, items: itemDef.children });
						render();
						return;
					}
					if (typeof itemDef.action === 'function') {
						runItem(itemDef.action);
					}
				});

				list.appendChild(row);
			});

			sheet.append(handle, header, list);
			requestAnimationFrame(() => onSheetReady?.(sheet));
		};

		const teardown = () => {
			removeDismiss();
			removeDismiss = () => {};
			unlockAppScroll();
			overlay.remove();
			MobileBottomSheetMenu.#active = null;
			historyPushed = false;
			const after = pendingAction;
			pendingAction = null;
			onClose?.();
			if (after) { try { after(); } catch (_) {} }
		};

		const requestClose = () => {
			if (historyPushed && history.state?.mappMsgMenu) {
				try { history.back(); return; } catch (_) {}
			}
			teardown();
		};

		const runItem = (action) => {
			if (historyPushed && history.state?.mappMsgMenu) {
				pendingAction = action;
				try { history.back(); return; } catch (_) {}
				pendingAction = null;
			}
			teardown();
			action?.();
		};

		const close = requestClose;

		MobileBottomSheetMenu.#active = { teardown, requestClose };
		lockAppScroll();
		overlay.appendChild(sheet);
		document.body.appendChild(overlay);
		history.pushState({ mappMsgMenu: true }, '');
		historyPushed = true;
		render();
		requestAnimationFrame(() => {
			sheet.style.transform = '';
			sheet.style.transition = '';
		});

		overlay.addEventListener('click', (e) => {
			if (e.target === overlay) {
				e.preventDefault();
				e.stopPropagation();
				requestClose();
			}
		}, true);

		removeDismiss = attachMenuDismiss(sheet, close);

		let dragStartY = 0;
		let dragY = 0;
		let dragging = false;
		const swipeZone = sheet;
		let dragListEl = null;

		const resetDrag = () => {
			dragging = false;
			dragY = 0;
			dragListEl = null;
			sheet.style.transition = '';
			sheet.style.transform = '';
		};

		const canStartSheetDrag = (touchTarget) => {
			if (touchTarget.closest('.mapp-sheet-handle, .mapp-sheet-header')) return true;
			const listEl = touchTarget.closest('.mapp-sheet-list');
			if (listEl && listEl.scrollTop <= 0) return true;
			return false;
		};

		swipeZone.addEventListener('touchstart', (e) => {
			if (e.touches.length !== 1) return;
			const touchTarget = e.target;
			if (!canStartSheetDrag(touchTarget)) return;
			dragListEl = touchTarget.closest('.mapp-sheet-list');
			dragStartY = e.touches[0].clientY;
			dragY = 0;
			dragging = true;
			sheet.style.transition = 'none';
		}, { passive: true });

		swipeZone.addEventListener('touchmove', (e) => {
			if (!dragging || e.touches.length !== 1) return;
			const delta = e.touches[0].clientY - dragStartY;
			if (delta <= 0) {
				dragY = 0;
				sheet.style.transform = '';
				return;
			}
			if (dragListEl && dragListEl.scrollTop > 0) {
				resetDrag();
				return;
			}
			dragY = delta;
			sheet.style.transform = `translateY(${dragY}px)`;
			if (dragY > 8) e.preventDefault();
		}, { passive: false });

		swipeZone.addEventListener('touchend', () => {
			if (!dragging) return;
			sheet.style.transition = 'transform .22s ease';
			if (dragY > 72) close();
			else resetDrag();
		}, { passive: true });

		swipeZone.addEventListener('touchcancel', resetDrag, { passive: true });

		onSheetReady?.(sheet);
		return { close, sheet };
	}
}

const AVATAR_MAX_DIMENSION = 1200;

const GROUP_CHAT_ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function messengerOrigin() {
	return window.location.origin;
}

/** Домен для отображения в «Поделиться» / QR (кириллический IDN вместо punycode). */
function messengerDisplayOrigin() {
	const origin = messengerOrigin();
	try {
		const u = new URL(origin);
		const host = idnHostnameToUnicode(u.hostname);
		if (host === u.hostname) return origin;
		return `${u.protocol}//${host}${u.port ? `:${u.port}` : ''}`;
	} catch {
		return origin;
	}
}

function formatMessengerShareUrl(url) {
	if (!url) return url;
	const origin = messengerOrigin();
	const displayOrigin = messengerDisplayOrigin();
	if (origin !== displayOrigin && url.startsWith(origin)) {
		return displayOrigin + url.slice(origin.length);
	}
	return url;
}

function idnHostnameToUnicode(hostname) {
	if (!hostname || !/xn--/i.test(hostname)) return hostname;
	if (typeof punycode !== 'undefined' && typeof punycode.toUnicode === 'function') {
		return punycode.toUnicode(hostname);
	}
	return hostname.split('.').map((label) => {
		if (!/^xn--/i.test(label)) return label;
		try {
			return punycodeDecodeLabel(label.slice(4).toLowerCase());
		} catch {
			return label;
		}
	}).join('.');
}

function punycodeDecodeLabel(input) {
	const base = 36;
	const tMin = 1;
	const tMax = 26;
	const skew = 38;
	const damp = 700;
	const initialBias = 72;
	const initialN = 128;
	const delimiter = 0x2D;
	const output = [];
	let i = 0;
	let n = initialN;
	let bias = initialBias;
	let basicEnd = input.lastIndexOf(delimiter);
	if (basicEnd > 0) {
		for (let j = 0; j < basicEnd; j++) {
			const cp = input.charCodeAt(j);
			if (cp >= 0x80) throw new RangeError('invalid-input');
			output.push(cp);
		}
	}
	i = basicEnd > 0 ? basicEnd + 1 : 0;
	let idx = 0;
	while (i < input.length) {
		let oldi = idx;
		let w = 1;
		for (let k = base; ; k += base) {
			if (i >= input.length) throw new RangeError('invalid-input');
			const digit = (() => {
				const cp = input.charCodeAt(i++);
				if (cp - 48 < 10) return cp - 22;
				if (cp - 65 < 26) return cp - 65;
				if (cp - 97 < 26) return cp - 97;
				return base;
			})();
			if (digit >= base) throw new RangeError('invalid-input');
			idx += digit * w;
			const t = k <= bias ? tMin : (k >= bias + tMax ? tMax : k - bias);
			if (digit < t) break;
			w *= base - t;
		}
		const out = output.length + 1;
		bias = (() => {
			let delta = idx - oldi;
			let k = 0;
			delta = out === 1 ? Math.floor(delta / damp) : delta >> 1;
			delta += Math.floor(delta / out);
			for (; delta > ((base - tMin) * tMax) >> 1; k += base) delta = Math.floor(delta / (base - tMin));
			return Math.floor(k + ((base - tMin + 1) * delta) / (delta + skew));
		})();
		n += Math.floor(idx / out);
		idx %= out;
		output.splice(idx++, 0, n);
	}
	return String.fromCodePoint(...output);
}

function buildUserProfileUrl(login) {
	const slug = encodeURIComponent(String(login || '').trim());
	return slug ? `${messengerDisplayOrigin()}/@${slug}` : null;
}

function buildGroupProfileUrl(chatId) {
	const id = String(chatId || '').trim();
	return id ? `${messengerDisplayOrigin()}/@${encodeURIComponent(id)}` : null;
}

let activeProfileAvatarClose = null;

function messengerHistoryHasStackedOverlay() {
	const s = history.state;
	if (!s) return false;
	return !!(
		s.mcImgViewer ||
		s.mappMsgMenu ||
		s.mappSettings ||
		s.mappOverlay ||
		s.mappAvatarView
	);
}

let messengerPopstateConsumed = false;
function messengerConsumePopstate() {
	messengerPopstateConsumed = true;
	// ВАЖНO: сбрасываем флаг макрозадачей (setTimeout), а не микрозадачей (Promise).
	// Между синхронными popstate-слушателями одного события выполняется microtask
	// checkpoint, поэтому Promise.then сбросил бы флаг ДО следующего слушателя,
	// и обработчик выхода из чата ошибочно срабатывал бы. setTimeout срабатывает
	// только после полного завершения текущей задачи (всех слушателей события).
	setTimeout(() => { messengerPopstateConsumed = false; }, 0);
}
function messengerPopstateWasConsumed() {
	return messengerPopstateConsumed;
}

/**
 * Стек закрываемых кнопкой "назад" оверлеев (модалки, диалоги, профили).
 * Верхний элемент закрывается первым.
 */
const messengerOverlayStack = [];
function messengerRegisterOverlay(fn) { messengerOverlayStack.push(fn); }
function messengerUnregisterOverlay(fn) {
	const i = messengerOverlayStack.lastIndexOf(fn);
	if (i >= 0) messengerOverlayStack.splice(i, 1);
}
function messengerCloseTopOverlayFromPopstate() {
	if (!messengerOverlayStack.length) return false;
	const fn = messengerOverlayStack.pop();
	try { fn(); } catch (_) {}
	return true;
}

/**
 * Делает оверлей закрываемым системной кнопкой "назад".
 * Возвращает функцию close(result), которую нужно вызывать вместо ручного удаления.
 * На десктопе history не используется (закрытие обычное, по кнопкам/Esc/клику).
 */
function messengerMakeDismissable(dismiss, cancelValue) {
	const useHistory = (typeof MessengerUtils !== 'undefined') && MessengerUtils.isMobile();
	let active = true;
	let pendingResult = cancelValue;
	let historyPushed = false;
	const finish = (result, fromPopstate) => {
		if (!active) return;
		active = false;
		messengerUnregisterOverlay(closer);
		historyPushed = false;
		dismiss(result, fromPopstate);
	};
	const closer = () => finish(pendingResult, true);
	const close = (result = cancelValue) => {
		if (useHistory && active && historyPushed && history.state?.mappOverlay) {
			pendingResult = result;
			try { history.back(); return; } catch (_) {}
		}
		finish(result, false);
	};
	if (useHistory) {
		messengerRegisterOverlay(closer);
		history.pushState({ mappOverlay: true }, '');
		historyPushed = true;
	}
	return close;
}

function messengerHandleOverlayPopstate() {
	// Порядок: сначала самые "верхние" интерактивные оверлеи (просмотр фото, меню),
	// затем стек модалок/диалогов, затем медиа-оверлеи.
	if (MessengerImageViewer.closeFromPopstate()) { messengerConsumePopstate(); return true; }
	if (MobileBottomSheetMenu.closeFromPopstate()) { messengerConsumePopstate(); return true; }
	if (messengerCloseTopOverlayFromPopstate()) { messengerConsumePopstate(); return true; }
	if (MessengerMediaOverlays.dismissOnPopstate()) { messengerConsumePopstate(); return true; }
	return false;
}

const MessengerMediaOverlays = {
	dismissOnPopstate() {
		if (MessengerImageViewer.closeFromPopstate()) return true;
		if (activeProfileAvatarClose) {
			activeProfileAvatarClose();
			activeProfileAvatarClose = null;
			return true;
		}
		const avatarOverlay = document.querySelector('.mapp-avatar-viewer-overlay');
		if (avatarOverlay) {
			avatarOverlay.remove();
			activeProfileAvatarClose = null;
			return true;
		}
		return false;
	},
	cleanupAll() {
		MessengerImageViewer.close(false);
		document.querySelectorAll('.mc-img-viewer').forEach(el => el.remove());
		document.querySelectorAll('.mapp-avatar-viewer-overlay').forEach(el => el.remove());
		if (activeProfileAvatarClose) {
			activeProfileAvatarClose();
			activeProfileAvatarClose = null;
		}
		MobileBottomSheetMenu.close(false);
		unlockAppScroll();
	},
};

class MessengerChatPreferences {
	static KEY_DESKTOP = 'messenger.sendOnEnter.desktop';
	static KEY_MOBILE = 'messenger.sendOnEnter.mobile';

	static isMobileViewport() {
		return window.innerWidth <= 1199;
	}

	static getSendOnEnter() {
		const key = MessengerChatPreferences.isMobileViewport()
			? MessengerChatPreferences.KEY_MOBILE
			: MessengerChatPreferences.KEY_DESKTOP;
		const stored = localStorage.getItem(key);
		if (stored !== null) return stored === '1';
		return !MessengerChatPreferences.isMobileViewport();
	}

	static setSendOnEnter(forMobile, enabled) {
		const key = forMobile ? MessengerChatPreferences.KEY_MOBILE : MessengerChatPreferences.KEY_DESKTOP;
		localStorage.setItem(key, enabled ? '1' : '0');
	}
}

function normalizeAppUrl() {
	const path = window.location.pathname || '/';
	if (/^\/@[^/]+/i.test(path) || /^\/register\/[^/]+/i.test(path)) {
		history.replaceState(null, '', '/');
	}
}
if (typeof window !== 'undefined') {
	window.normalizeAppUrl = normalizeAppUrl;
}

function isGroupChatId(id) {
	return GROUP_CHAT_ID_RE.test(String(id || '').trim());
}

function createProfileQrButton({ link, qrTitle, icons, i18n, themeManager, className = 'mc-panel-window-qr-btn' }) {
	if (!link) return null;
	const qrBtn = document.createElement('button');
	qrBtn.type = 'button';
	qrBtn.className = className;
	qrBtn.title = qrTitle || 'QR';
	qrBtn.innerHTML = icons.qrCode();
	qrBtn.addEventListener('click', (e) => {
		e.stopPropagation();
		MessengerQrDialog.show({ link, title: qrTitle, i18n, themeManager });
	});
	return qrBtn;
}

class MessengerQrDialog {
	static show({ link, title, i18n, themeManager }) {
		if (!link) return;
		const overlay = document.createElement('div');
		overlay.className = 'mapp-qr-overlay';
		const dialog = document.createElement('div');
		dialog.className = 'mapp-qr-dialog';
		if (themeManager) {
			themeManager.applyChatVars(dialog);
			themeManager.applyAppVars(dialog);
		}
		const heading = document.createElement('h3');
		heading.className = 'mapp-qr-dialog-title';
		heading.textContent = title || 'QR';
		const canvasWrap = document.createElement('div');
		canvasWrap.className = 'mapp-qr-canvas';
		const linkEl = document.createElement('div');
		linkEl.className = 'mapp-qr-link mapp-selectable-text';
		linkEl.textContent = formatMessengerShareUrl(link);
		const closeBtn = document.createElement('button');
		closeBtn.type = 'button';
		closeBtn.className = 'mapp-btn mapp-btn-secondary mapp-qr-close-btn';
		closeBtn.textContent = i18n?.t('qrClose') || 'Close';
		closeBtn.addEventListener('click', () => overlay.remove());
		overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
		dialog.append(heading, canvasWrap, linkEl, closeBtn);
		overlay.appendChild(dialog);
		document.body.appendChild(overlay);
		const showError = () => {
			canvasWrap.textContent = i18n?.t('qrLibMissing') || 'QR library not loaded';
		};
		if (typeof SupraQr !== 'undefined' && SupraQr.isAvailable()) {
			SupraQr.render(canvasWrap, { text: link, size: 220 }).catch(showError);
		} else {
			showError();
		}
	}
}

async function compressImageFile(file, maxSize = AVATAR_MAX_DIMENSION, quality = 0.85) {
	if (!file || !file.type.startsWith('image/')) return file;
	return new Promise((resolve) => {
		const img = new Image();
		const objUrl = URL.createObjectURL(file);
		img.onload = () => {
			URL.revokeObjectURL(objUrl);
			let w = img.naturalWidth;
			let h = img.naturalHeight;
			if (w === 0 || h === 0) { resolve(file); return; }
			if (w > maxSize || h > maxSize) {
				if (w >= h) { h = Math.round(h * maxSize / w); w = maxSize; }
				else { w = Math.round(w * maxSize / h); h = maxSize; }
			}
			const canvas = document.createElement('canvas');
			canvas.width = w;
			canvas.height = h;
			canvas.getContext('2d').drawImage(img, 0, 0, w, h);
			canvas.toBlob(blob => {
				if (!blob) { resolve(file); return; }
				resolve(new File([blob], 'avatar.jpg', { type: 'image/jpeg' }));
			}, 'image/jpeg', quality);
		};
		img.onerror = () => { URL.revokeObjectURL(objUrl); resolve(file); };
		img.src = objUrl;
	});
}

// In-app camera capture (works on desktop + mobile via getUserMedia).
// Produces a square JPEG File and passes it to onCapture.
class MessengerCameraCapture {
	static #active = null;

	static isSupported() {
		return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
	}

	static close() {
		MessengerCameraCapture.#active?.();
		MessengerCameraCapture.#active = null;
	}

	static async open({ i18n, themeManager = null, onCapture = null } = {}) {
		if (!MessengerCameraCapture.isSupported()) {
			await MessengerDialog.alert({
				title: i18n?.t('cameraTitle') || 'Camera',
				message: i18n?.t('cameraUnavailable') || 'Camera is not available',
				type: MessengerDialog.TYPE_DANGER,
				themeManager,
			});
			return false;
		}

		MessengerCameraCapture.close();
		lockAppScroll();

		const overlay = document.createElement('div');
		overlay.className = 'mapp-camera-overlay';

		const stage = document.createElement('div');
		stage.className = 'mapp-camera-stage';
		const video = document.createElement('video');
		video.className = 'mapp-camera-video';
		video.autoplay = true;
		video.playsInline = true;
		video.muted = true;
		stage.appendChild(video);

		const controls = document.createElement('div');
		controls.className = 'mapp-camera-controls';

		const closeBtn = document.createElement('button');
		closeBtn.type = 'button';
		closeBtn.className = 'mapp-camera-btn mapp-camera-btn--close';
		closeBtn.innerHTML = '&times;';
		closeBtn.setAttribute('aria-label', 'Close');

		const shutter = document.createElement('button');
		shutter.type = 'button';
		shutter.className = 'mapp-camera-shutter';
		shutter.title = i18n?.t('cameraCapture') || 'Capture';

		const switchBtn = document.createElement('button');
		switchBtn.type = 'button';
		switchBtn.className = 'mapp-camera-btn mapp-camera-btn--switch';
		switchBtn.title = i18n?.t('cameraSwitch') || 'Switch camera';
		switchBtn.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>`;
		switchBtn.hidden = true;

		controls.append(closeBtn, shutter, switchBtn);
		overlay.append(stage, controls);
		document.body.appendChild(overlay);

		let stream = null;
		let facing = 'user';

		const stopStream = () => {
			if (stream) {
				stream.getTracks().forEach(t => t.stop());
				stream = null;
			}
		};

		const close = () => {
			stopStream();
			overlay.remove();
			unlockAppScroll();
			window.removeEventListener('keydown', onKey);
			MessengerCameraCapture.#active = null;
		};

		const onKey = (e) => { if (e.key === 'Escape') close(); };
		window.addEventListener('keydown', onKey);
		MessengerCameraCapture.#active = close;

		const applyMirror = () => {
			video.classList.toggle('mc-camera-preview--mirror', facing === 'user');
		};

		const startStream = async () => {
			stopStream();
			stream = await navigator.mediaDevices.getUserMedia({
				video: { facingMode: facing },
				audio: false,
			});
			video.srcObject = stream;
			applyMirror();
			try { await video.play(); } catch { /* autoplay fallback */ }
		};

		try {
			await startStream();
		} catch (e) {
			console.warn('[MessengerCameraCapture] getUserMedia failed', e);
			close();
			await MessengerDialog.alert({
				title: i18n?.t('cameraTitle') || 'Camera',
				message: i18n?.t('cameraDenied') || 'Camera access denied',
				type: MessengerDialog.TYPE_DANGER,
				themeManager,
			});
			return false;
		}

		// Show switch only when more than one camera is available.
		try {
			const devices = await navigator.mediaDevices.enumerateDevices();
			if (devices.filter(d => d.kind === 'videoinput').length > 1) {
				switchBtn.hidden = false;
			}
		} catch { /* ignore */ }

		switchBtn.addEventListener('click', async () => {
			facing = facing === 'user' ? 'environment' : 'user';
			try {
				await startStream();
			} catch {
				facing = facing === 'user' ? 'environment' : 'user';
				try { await startStream(); } catch { /* ignore */ }
			}
		});

		closeBtn.addEventListener('click', close);
		overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });

		shutter.addEventListener('click', () => {
			const vw = video.videoWidth;
			const vh = video.videoHeight;
			if (!vw || !vh) return;
			const size = Math.min(vw, vh);
			const out = Math.min(size, AVATAR_MAX_DIMENSION);
			const canvas = document.createElement('canvas');
			canvas.width = out;
			canvas.height = out;
			const ctx = canvas.getContext('2d');
			if (facing === 'user') {
				ctx.translate(out, 0);
				ctx.scale(-1, 1);
			}
			ctx.drawImage(video, (vw - size) / 2, (vh - size) / 2, size, size, 0, 0, out, out);
			canvas.toBlob((blob) => {
				if (!blob) return;
				const file = new File([blob], 'camera.jpg', { type: 'image/jpeg' });
				close();
				onCapture?.(file);
			}, 'image/jpeg', 0.9);
		});

		return true;
	}
}

// Crop/zoom editor with circular preview mask (after gallery or camera pick).
class MessengerAvatarCropEditor {
	static VIEWPORT = 280;
	static #active = null;

	static close() {
		MessengerAvatarCropEditor.#active?.();
		MessengerAvatarCropEditor.#active = null;
	}

	static open({
		file,
		i18n = null,
		themeManager = null,
		outputSize = 512,
		onConfirm = null,
		onCancel = null,
	} = {}) {
		if (!file) return;
		MessengerAvatarCropEditor.close();

		const objUrl = URL.createObjectURL(file);
		const img = new Image();
		img.onload = () => {
			if (!img.naturalWidth || !img.naturalHeight) {
				URL.revokeObjectURL(objUrl);
				onCancel?.();
				return;
			}
			MessengerAvatarCropEditor.#mount({
				img,
				previewUrl: objUrl,
				i18n,
				themeManager,
				outputSize,
				onConfirm,
				onCancel,
			});
		};
		img.onerror = () => {
			URL.revokeObjectURL(objUrl);
			onCancel?.();
		};
		img.src = objUrl;
	}

	static #mount({ img, previewUrl, i18n, themeManager, outputSize, onConfirm, onCancel }) {
		const vp = MessengerAvatarCropEditor.VIEWPORT;
		const iw = img.naturalWidth;
		const ih = img.naturalHeight;
		const minScale = Math.max(vp / iw, vp / ih);
		const maxScale = minScale * 3;
		let scale = minScale;
		let tx = 0;
		let ty = 0;

		lockAppScroll();
		const overlay = document.createElement('div');
		overlay.className = 'mapp-modal-overlay mapp-avatar-crop-overlay';

		const dialog = document.createElement('div');
		dialog.className = 'mapp-avatar-crop-dialog';
		if (themeManager) {
			themeManager.applyChatVars(dialog);
			themeManager.applyAppVars(dialog);
		}

		const title = document.createElement('h3');
		title.className = 'mapp-avatar-crop-title';
		title.textContent = i18n?.t('avatarCropTitle') || 'Edit photo';

		const hint = document.createElement('p');
		hint.className = 'mapp-avatar-crop-hint';
		hint.textContent = i18n?.t('avatarCropHint') || 'Drag and zoom';

		const viewport = document.createElement('div');
		viewport.className = 'mapp-avatar-crop-viewport';
		viewport.setAttribute('role', 'img');
		viewport.setAttribute('aria-label', title.textContent);

		const cropImg = img;
		cropImg.className = 'mapp-avatar-crop-img';
		cropImg.alt = '';
		cropImg.draggable = false;

		const mask = document.createElement('div');
		mask.className = 'mapp-avatar-crop-mask';
		mask.setAttribute('aria-hidden', 'true');

		const ring = document.createElement('div');
		ring.className = 'mapp-avatar-crop-ring';
		ring.setAttribute('aria-hidden', 'true');

		viewport.append(cropImg, mask, ring);

		const zoomRow = document.createElement('div');
		zoomRow.className = 'mapp-avatar-crop-zoom-row';
		const zoomLabel = document.createElement('span');
		zoomLabel.className = 'mapp-avatar-crop-zoom-label';
		zoomLabel.textContent = i18n?.t('avatarCropZoom') || 'Zoom';
		const zoomInput = document.createElement('input');
		zoomInput.type = 'range';
		zoomInput.className = 'mapp-avatar-crop-zoom';
		zoomInput.min = '0';
		zoomInput.max = '100';
		zoomInput.value = '0';
		zoomRow.append(zoomLabel, zoomInput);

		const actions = document.createElement('div');
		actions.className = 'mapp-avatar-crop-actions';
		const cancelBtn = document.createElement('button');
		cancelBtn.type = 'button';
		cancelBtn.className = 'mapp-avatar-crop-cancel';
		cancelBtn.textContent = i18n?.t('cancel') || 'Cancel';
		const applyBtn = document.createElement('button');
		applyBtn.type = 'button';
		applyBtn.className = 'mapp-avatar-crop-apply';
		applyBtn.textContent = i18n?.t('avatarCropApply') || 'Done';
		actions.append(cancelBtn, applyBtn);

		dialog.append(title, hint, viewport, zoomRow, actions);
		overlay.appendChild(dialog);
		document.body.appendChild(overlay);

		const clampPan = () => {
			const dw = iw * scale;
			const dh = ih * scale;
			const maxTx = Math.max(0, (dw - vp) / 2);
			const maxTy = Math.max(0, (dh - vp) / 2);
			tx = Math.min(maxTx, Math.max(-maxTx, tx));
			ty = Math.min(maxTy, Math.max(-maxTy, ty));
		};

		const applyTransform = () => {
			const dw = iw * scale;
			const dh = ih * scale;
			cropImg.style.width = `${dw}px`;
			cropImg.style.height = `${dh}px`;
			cropImg.style.left = `${(vp - dw) / 2 + tx}px`;
			cropImg.style.top = `${(vp - dh) / 2 + ty}px`;
		};

		const scaleToSlider = () => {
			if (maxScale <= minScale) return 0;
			return Math.round(((scale - minScale) / (maxScale - minScale)) * 100);
		};

		const sliderToScale = (v) => {
			const t = Number(v) / 100;
			return minScale + t * (maxScale - minScale);
		};

		const syncSlider = () => { zoomInput.value = String(scaleToSlider()); };

		const setScale = (next, anchorX = vp / 2, anchorY = vp / 2) => {
			const prev = scale;
			const clamped = Math.min(maxScale, Math.max(minScale, next));
			if (prev !== clamped) {
				const imgX = (anchorX - (vp - iw * prev) / 2 - tx) / prev;
				const imgY = (anchorY - (vp - ih * prev) / 2 - ty) / prev;
				scale = clamped;
				tx = anchorX - (vp - iw * scale) / 2 - imgX * scale;
				ty = anchorY - (vp - ih * scale) / 2 - imgY * scale;
			} else {
				scale = clamped;
			}
			clampPan();
			applyTransform();
			syncSlider();
		};

		const close = () => {
			if (previewUrl) URL.revokeObjectURL(previewUrl);
			unlockAppScroll();
			overlay.remove();
			window.removeEventListener('keydown', onKey);
			MessengerAvatarCropEditor.#active = null;
		};

		const onKey = (e) => { if (e.key === 'Escape') { close(); onCancel?.(); } };
		window.addEventListener('keydown', onKey);
		MessengerAvatarCropEditor.#active = close;

		cancelBtn.addEventListener('click', () => { close(); onCancel?.(); });
		overlay.addEventListener('click', (e) => {
			if (e.target === overlay) { close(); onCancel?.(); }
		});

		zoomInput.addEventListener('input', () => {
			setScale(sliderToScale(zoomInput.value));
		});

		viewport.addEventListener('wheel', (e) => {
			e.preventDefault();
			const rect = viewport.getBoundingClientRect();
			const ax = e.clientX - rect.left;
			const ay = e.clientY - rect.top;
			setScale(scale * (1 - e.deltaY * 0.002), ax, ay);
		}, { passive: false });

		let dragging = false;
		let ptrId = null;
		let startX = 0;
		let startY = 0;
		let startTx = 0;
		let startTy = 0;
		let pinchDist = 0;
		let pinchScale = minScale;

		viewport.addEventListener('pointerdown', (e) => {
			if (e.target === zoomInput) return;
			if (e.pointerType === 'touch' && e.isPrimary === false) return;
			dragging = true;
			ptrId = e.pointerId;
			startX = e.clientX;
			startY = e.clientY;
			startTx = tx;
			startTy = ty;
			viewport.setPointerCapture(e.pointerId);
		});

		viewport.addEventListener('pointermove', (e) => {
			if (!dragging || e.pointerId !== ptrId) return;
			tx = startTx + (e.clientX - startX);
			ty = startTy + (e.clientY - startY);
			clampPan();
			applyTransform();
		});

		const endDrag = (e) => {
			if (e.pointerId !== ptrId) return;
			dragging = false;
			ptrId = null;
			try { viewport.releasePointerCapture(e.pointerId); } catch { /* ignore */ }
		};
		viewport.addEventListener('pointerup', endDrag);
		viewport.addEventListener('pointercancel', endDrag);

		// Pinch-to-zoom on touch devices
		viewport.addEventListener('touchstart', (e) => {
			if (e.touches.length === 2) {
				e.preventDefault();
				const [a, b] = e.touches;
				pinchDist = Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY);
				pinchScale = scale;
				dragging = false;
			}
		}, { passive: false });

		viewport.addEventListener('touchmove', (e) => {
			if (e.touches.length !== 2 || pinchDist <= 0) return;
			e.preventDefault();
			const [a, b] = e.touches;
			const dist = Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY);
			const rect = viewport.getBoundingClientRect();
			const ax = (a.clientX + b.clientX) / 2 - rect.left;
			const ay = (a.clientY + b.clientY) / 2 - rect.top;
			setScale(pinchScale * (dist / pinchDist), ax, ay);
		}, { passive: false });

		viewport.addEventListener('touchend', () => { pinchDist = 0; });

		const setProcessing = (on) => {
			let busy = dialog.querySelector('.mapp-avatar-crop-busy');
			if (on) {
				if (!busy) {
					busy = document.createElement('div');
					busy.className = 'mapp-avatar-crop-busy';
					const spin = document.createElement('div');
					spin.className = 'mc-loader-spinner';
					const txt = document.createElement('span');
					txt.className = 'mapp-avatar-crop-busy-text';
					txt.textContent = i18n?.t('loading') || 'Loading…';
					busy.append(spin, txt);
					dialog.appendChild(busy);
				}
				busy.hidden = false;
				cancelBtn.disabled = true;
				applyBtn.disabled = true;
				zoomInput.disabled = true;
				viewport.classList.add('mc-crop-viewport--no-events');
			} else if (busy) {
				busy.hidden = true;
				cancelBtn.disabled = false;
				applyBtn.disabled = false;
				zoomInput.disabled = false;
				viewport.classList.remove('mc-crop-viewport--no-events');
			}
		};

		applyBtn.addEventListener('click', async () => {
			setProcessing(true);
			try {
				const out = await MessengerAvatarCropEditor.#exportJpeg(
					img, scale, tx, ty, vp, outputSize
				);
				close();
				if (out) onConfirm?.(out);
				else onCancel?.();
			} catch {
				setProcessing(false);
			}
		});

		clampPan();
		applyTransform();
		syncSlider();
	}

	static #exportJpeg(img, scale, tx, ty, viewportSize, outputSize) {
		return new Promise((resolve) => {
			const iw = img.naturalWidth;
			const ih = img.naturalHeight;
			const dw = iw * scale;
			const dh = ih * scale;
			const x = (viewportSize - dw) / 2 + tx;
			const y = (viewportSize - dh) / 2 + ty;
			const k = outputSize / viewportSize;
			const canvas = document.createElement('canvas');
			canvas.width = outputSize;
			canvas.height = outputSize;
			const ctx = canvas.getContext('2d');
			ctx.beginPath();
			ctx.arc(outputSize / 2, outputSize / 2, outputSize / 2, 0, Math.PI * 2);
			ctx.clip();
			ctx.drawImage(img, x * k, y * k, dw * k, dh * k);
			canvas.toBlob((blob) => {
				if (!blob) { resolve(null); return; }
				resolve(new File([blob], 'avatar.jpg', { type: 'image/jpeg' }));
			}, 'image/jpeg', 0.92);
		});
	}
}

/** Same system picker as chat attach (file mode, no accept — combined gallery/files on Android). */
async function pickMessengerFiles({ accept = undefined, multiple = false } = {}) {
	if (typeof FileUploader === 'undefined' || typeof FileUploader.pickFiles !== 'function') {
		console.warn('[pickMessengerFiles] FileUploader.pickFiles not available');
		return [];
	}
	return FileUploader.pickFiles({ camera: false, accept, multiple });
}

// Opens the chat-style file picker immediately, optional crop, then onPick(file).
function openAvatarSourcePicker({
	i18n,
	themeManager = null,
	onPick = null,
	cropOutputSize = 512,
	useCropEditor = true,
} = {}) {
	const deliver = (f) => {
		if (!f) return;
		if (!useCropEditor) {
			onPick?.(f);
			return;
		}
		MessengerAvatarCropEditor.open({
			file: f,
			i18n,
			themeManager,
			outputSize: cropOutputSize,
			onConfirm: (cropped) => onPick?.(cropped),
		});
	};

	(async () => {
		try {
			const files = await pickMessengerFiles();
			const f = files?.[0];
			if (!f) return;
			if (!f.type?.startsWith('image/')) {
				MessengerDialog.alert({
					title: i18n?.t('avatarSourceTitle') || '',
					message: i18n?.t('avatarImageOnly') || 'Выберите изображение.',
					type: MessengerDialog.TYPE_WARNING,
					themeManager,
				});
				return;
			}
			deliver(f);
		} catch {
			/* picker closed */
		}
	})();
}

function mkPrivacyRow(labelText, i18n, value) {
	const row = document.createElement('div');
	row.className = 'mapp-privacy-row mapp-ui-form-row';
	const label = document.createElement('span');
	label.className = 'mapp-privacy-row-label mapp-toggle-label';
	label.textContent = labelText;
	const sel = document.createElement('select');
	sel.className = 'mapp-privacy-picker mapp-ui-select';
	const optAll = document.createElement('option');
	optAll.value = 'everyone';
	optAll.textContent = i18n.t('privacyEveryone');
	const optContacts = document.createElement('option');
	optContacts.value = 'contacts';
	optContacts.textContent = i18n.t('privacyContacts');
	sel.append(optAll, optContacts);
	sel.value = value || 'everyone';
	row.append(label, sel);
	return { row, sel };
}

/** Reliable tap/click for touch screens (avoids missed `click` after scroll/select). */
function bindTapAction(el, handler, { stopPropagation = false } = {}) {
	if (!el || typeof handler !== 'function') return;
	el.setAttribute('role', 'button');
	if (!el.hasAttribute('tabindex')) el.tabIndex = 0;
	const invoke = (e) => {
		if (stopPropagation) e.stopPropagation();
		handler(e);
	};
	el.addEventListener('keydown', (e) => {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			invoke(e);
		}
	});
	let pointerId = null;
	let startX = 0;
	let startY = 0;
	let pointerDownAt = 0;
	const TAP_SLOP_PX = 12;
	const LONG_PRESS_MS = 400;
	el.addEventListener('pointerdown', (e) => {
		if (e.button !== 0) return;
		pointerId = e.pointerId;
		startX = e.clientX;
		startY = e.clientY;
		pointerDownAt = Date.now();
	});
	const clearPointer = (e) => {
		if (pointerId == null || e.pointerId !== pointerId) return;
		const dx = e.clientX - startX;
		const dy = e.clientY - startY;
		const heldMs = Date.now() - pointerDownAt;
		pointerId = null;
		if (dx * dx + dy * dy > TAP_SLOP_PX * TAP_SLOP_PX) return;
		if (heldMs >= LONG_PRESS_MS) return;
		invoke(e);
	};
	el.addEventListener('pointerup', clearPointer);
	el.addEventListener('pointercancel', () => { pointerId = null; });
}

function bindChatHeaderProfileClick(hitEl, chat, callbacks) {
	if (!hitEl || !chat || !callbacks) return;
	const isGroup = chat.type === 'group' || chat.type === 'public_group';
	const canOpen = (isGroup && callbacks.onShowGroupProfile)
		|| (chat.type === 'direct' && callbacks.onShowProfile);
	if (!canOpen) return;
	hitEl.classList.add('mc-cursor-pointer', 'mapp-sidebar-user--interactive');
	bindTapAction(hitEl, () => {
		if (isGroup) callbacks.onShowGroupProfile?.(chat);
		else callbacks.onShowProfile?.(chat);
	}, { stopPropagation: true });
}

function mkUiCard(titleText) {
	const card = document.createElement('div');
	card.className = 'mapp-ui-card';
	if (titleText) {
		const title = document.createElement('div');
		title.className = 'mapp-ui-card-title';
		title.textContent = titleText;
		card.appendChild(title);
	}
	return card;
}

function mkToggleSwitch(inputEl) {
	const switchWrap = document.createElement('div');
	switchWrap.className = 'mapp-toggle-switch';
	const label = document.createElement('label');
	if (!inputEl.id) {
		inputEl.id = `mapp-toggle-${Math.random().toString(36).slice(2, 9)}`;
	}
	label.htmlFor = inputEl.id;
	switchWrap.append(inputEl, label);
	return switchWrap;
}

function mkToggleRow(labelText, inputEl, sublabelText) {
	const row = document.createElement('div');
	row.className = 'mapp-toggle-row';
	const info = document.createElement('div');
	info.className = 'mapp-toggle-info';
	const lbl = document.createElement('div');
	lbl.className = 'mapp-toggle-label';
	lbl.textContent = labelText;
	info.appendChild(lbl);
	if (sublabelText) {
		const sub = document.createElement('div');
		sub.className = 'mapp-toggle-sub';
		sub.textContent = sublabelText;
		info.appendChild(sub);
	}
	row.append(info, mkToggleSwitch(inputEl));
	return row;
}

function mkToggleField(labelText, { checked = false, sublabel } = {}) {
	const input = document.createElement('input');
	input.type = 'checkbox';
	input.checked = checked;
	return { row: mkToggleRow(labelText, input, sublabel), input };
}

function setProfileFieldValidation(fieldWrap, tone, hintText) {
	if (!fieldWrap) return;
	const input = fieldWrap.querySelector('.mapp-profile-field-input, .mapp-modal-group-name-input, input, textarea, select');
	let hint = fieldWrap.querySelector('.mapp-input-hint');
	if (hintText) {
		if (!hint) {
			hint = document.createElement('div');
			hint.className = 'mapp-input-hint';
			fieldWrap.appendChild(hint);
		}
		hint.hidden = false;
		hint.textContent = hintText;
		hint.classList.toggle('mapp-input-hint--err', tone === 'err');
		hint.classList.toggle('mapp-input-hint--ok', tone === 'ok');
	} else if (hint) {
		hint.hidden = true;
		hint.textContent = '';
		hint.classList.remove('mapp-input-hint--err', 'mapp-input-hint--ok');
	}
	if (input) {
		input.classList.toggle('mapp-profile-field-input--error', tone === 'err');
		input.classList.toggle('mapp-profile-field-input--success', tone === 'ok');
	}
}

function applyStandardFieldInput(el) {
	if (!el) return;
	el.classList.add('mapp-field-input', 'mapp-profile-field-input');
}

function applyProfilePasswordFieldStyle(field) {
	if (!field?.wrap || !field?.input) return;
	field.wrap.classList.add('mapp-profile-password-field');
	applyStandardFieldInput(field.input);
}

function applyPrimaryActionButton(btn) {
	if (!btn) return;
	btn.classList.add('mapp-btn', 'mapp-btn-primary');
}

function mkProfileField(labelText, inputEl, { hint } = {}) {
	const fieldWrap = document.createElement('div');
	fieldWrap.className = 'mapp-profile-field mapp-ui-form-field';
	const cap = document.createElement('label');
	cap.className = 'mapp-ui-field-label';
	cap.textContent = labelText;
	const isFormControl = inputEl instanceof HTMLInputElement
		|| inputEl instanceof HTMLTextAreaElement
		|| inputEl instanceof HTMLSelectElement;
	if (isFormControl) applyStandardFieldInput(inputEl);
	fieldWrap.append(cap, inputEl);
	if (hint) {
		const hintEl = document.createElement('div');
		hintEl.className = 'mapp-input-hint';
		hintEl.textContent = hint;
		fieldWrap.appendChild(hintEl);
	}
	return fieldWrap;
}

const THEME_PREVIEW_CHECK_SVG = '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M1 6l3.5 3.5L11 2" stroke="white" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>';

function buildThemePreviewMini(theme) {
	const preview = document.createElement('div');
	preview.className = 'mapp-theme-preview';
	preview.style.background = theme.bodyBg || theme.chatBg || '#f0f2f5';

	const bar = document.createElement('div');
	bar.className = 'mapp-theme-preview-bar';
	bar.style.width = '55%';
	bar.style.background = theme.accent || theme.myBubbleBg || '#4a7fc1';
	preview.appendChild(bar);

	const inRow = document.createElement('div');
	inRow.className = 'mapp-theme-preview-bubble-row';
	const inBubble = document.createElement('div');
	inBubble.className = 'mapp-theme-preview-bubble';
	inBubble.style.width = '60%';
	inBubble.style.background = theme.otherBubbleBg || theme.inputFieldBg || '#e8e9f0';
	inRow.appendChild(inBubble);
	preview.appendChild(inRow);

	const outRow = document.createElement('div');
	outRow.className = 'mapp-theme-preview-bubble-row mapp-theme-preview-bubble-row--out';
	const outBubble = document.createElement('div');
	outBubble.className = 'mapp-theme-preview-bubble';
	outBubble.style.width = '45%';
	outBubble.style.background = theme.myBubbleBg || theme.accent || '#4a7fc1';
	outRow.appendChild(outBubble);
	preview.appendChild(outRow);

	const accentBar = document.createElement('div');
	accentBar.className = 'mapp-theme-preview-bar mapp-theme-preview-bar--accent';
	accentBar.style.width = '35%';
	accentBar.style.background = theme.senderName || theme.accent || '#4a7fc1';
	preview.appendChild(accentBar);

	return preview;
}

function buildThemeAppearancePanel({ themeManager, i18n }) {
	const wrap = document.createElement('div');
	wrap.className = 'mapp-theme-appearance';

	const card = mkUiCard(i18n.t('theme'));
	const darkThemes = themeManager.themes.filter(t => MessengerThemeManager.isThemeDark(t));
	const lightThemes = themeManager.themes.filter(t => !MessengerThemeManager.isThemeDark(t));

	const renderGroup = (groupTitle, themes) => {
		if (!themes.length) return;
		const groupLabel = document.createElement('div');
		groupLabel.className = 'mapp-theme-group-label';
		groupLabel.textContent = groupTitle;
		card.appendChild(groupLabel);

		const grid = document.createElement('div');
		grid.className = 'mapp-theme-grid';
		themes.forEach((theme) => {
			const themeCard = document.createElement('button');
			themeCard.type = 'button';
			themeCard.className = 'mapp-theme-card';
			themeCard.dataset.themeName = theme.name;
			if (theme.name === themeManager.current.name) {
				themeCard.classList.add('mapp-theme-card--selected');
			}

			const check = document.createElement('div');
			check.className = 'mapp-theme-check';
			check.innerHTML = THEME_PREVIEW_CHECK_SVG;

			const nameEl = document.createElement('div');
			nameEl.className = 'mapp-theme-name';
			nameEl.textContent = theme.name;
			nameEl.style.background = theme.headerBg || theme.menuBg || theme.bodyBg;
			nameEl.style.color = theme.headerText || theme.menuText || theme.otherBubbleText;

			themeCard.append(check, buildThemePreviewMini(theme), nameEl);
			themeCard.addEventListener('click', () => {
				themeManager.applyTheme(theme);
				wrap.querySelectorAll('.mapp-theme-card').forEach((el) => {
					el.classList.toggle('mapp-theme-card--selected', el === themeCard);
				});
			});
			grid.appendChild(themeCard);
		});
		card.appendChild(grid);
	};

	renderGroup(i18n.t('themeGroupDark'), darkThemes);
	renderGroup(i18n.t('themeGroupLight'), lightThemes);
	wrap.appendChild(card);
	return wrap;
}

function buildContactSearchBar(icons, placeholder) {
	const wrap = document.createElement('div');
	wrap.className = 'mapp-contact-search-wrap';
	const bar = document.createElement('div');
	bar.className = 'mapp-contact-search-bar';
	const icon = document.createElement('span');
	icon.className = 'mapp-contact-search-icon';
	icon.innerHTML = icons.search();
	const input = document.createElement('input');
	input.type = 'search';
	input.className = 'mapp-contact-search-input';
	input.placeholder = placeholder;
	input.setAttribute('autocomplete', 'off');
	input.setAttribute('enterkeyhint', 'search');
	bar.append(icon, input);
	wrap.appendChild(bar);
	return { wrap, input };
}

const PROFILE_STATUS_TEXT_MAX = 20;
const PROFILE_ABOUT_TEXT_MAX = 140;

function sanitizeAppHtml(html) {
	if (!html) return '';
	const doc = new DOMParser().parseFromString(String(html), 'text/html');
	doc.querySelectorAll('script, iframe, object, embed, link, style, form, base').forEach((n) => n.remove());
	doc.querySelectorAll('*').forEach((el) => {
		[...el.attributes].forEach((attr) => {
			const name = attr.name.toLowerCase();
			if (name.startsWith('on')
				|| (name === 'href' && /^javascript:/i.test(attr.value || ''))
				|| (name === 'src' && /^javascript:/i.test(attr.value || ''))) {
				el.removeAttribute(attr.name);
			}
		});
	});
	return doc.body.innerHTML;
}

function formatAppBrandedHtml(html, appName) {
	const text = (html || '').trim();
	const name = (appName || '').trim();
	if (!text || !name) return text;
	if (/\{\{appName\}\}/i.test(text)) {
		const escaped = name
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;');
		return text.replace(/\{\{appName\}\}/gi, escaped);
	}
	return text
		.replace(/\bSupra Messenger\b/gi, name)
		.replace(/\bSuperMessenger\b/gi, name);
}

function buildAppHtmlSettingsPanel(html, emptyLabel = '—', cardTitle = '') {
	const scroll = document.createElement('div');
	scroll.className = 'mapp-profile-tab-scroll mapp-profile-form-page';
	const card = mkUiCard(cardTitle || undefined);
	const inner = document.createElement('div');
	inner.className = 'mapp-app-html-content mapp-selectable-text';
	const trimmed = (html || '').trim();
	if (trimmed) inner.innerHTML = sanitizeAppHtml(trimmed);
	else {
		inner.classList.add('mapp-app-html-content--empty');
		inner.textContent = emptyLabel;
	}
	card.appendChild(inner);
	scroll.appendChild(card);
	return scroll;
}

function buildAboutSettingsPanel({ branding, i18n, themeManager }) {
	const scroll = document.createElement('div');
	scroll.className = 'mapp-profile-tab-scroll mapp-profile-form-page';
	const card = mkUiCard(i18n.t('aboutAppTab'));
	const appName = (branding?.appName || '').trim();

	const versionLine = document.createElement('div');
	versionLine.className = 'mapp-about-version-line';
	const versionBtn = document.createElement('button');
	versionBtn.type = 'button';
	versionBtn.className = 'mapp-about-version-link';
	const version = (branding?.appVersion || '').trim() || '—';
	versionBtn.textContent = version;
	const changelogHtml = formatAppBrandedHtml(branding?.changelogHtml || '', appName);
	const hasChangelog = !!changelogHtml.trim();
	if (hasChangelog) {
		versionBtn.addEventListener('click', () => {
			MessengerDialog.openHtmlModal({
				title: i18n.t('changelogTitle'),
				html: changelogHtml,
				themeManager,
			});
		});
	} else {
		versionBtn.disabled = true;
		versionBtn.title = i18n.t('contentEmpty');
	}
	versionLine.appendChild(versionBtn);
	card.appendChild(versionLine);

	const debugBtn = document.createElement('button');
	debugBtn.type = 'button';
	debugBtn.className = 'mapp-btn mapp-btn-secondary mapp-btn-block mapp-btn-settings-wide mapp-about-debug-btn';
	debugBtn.textContent = i18n.t('debugLogButton');
	debugBtn.addEventListener('click', () => {
		if (window.AppBootLog?.openModal) {
			window.AppBootLog.openModal({ themeManager, i18n });
			return;
		}
		MessengerDialog.alert({
			title: i18n.t('debugLogTitle'),
			message: i18n.t('debugLogEmpty'),
		});
	});

	const aboutTrim = formatAppBrandedHtml(branding?.aboutHtml || '', appName);
	if (aboutTrim) {
		const aboutEl = document.createElement('div');
		aboutEl.className = 'mapp-app-html-content mapp-selectable-text';
		aboutEl.innerHTML = sanitizeAppHtml(aboutTrim);
		card.appendChild(aboutEl);
	} else {
		const emptyEl = document.createElement('div');
		emptyEl.className = 'mapp-app-html-content mapp-app-html-content--empty mapp-selectable-text';
		emptyEl.textContent = i18n.t('contentEmpty');
		card.appendChild(emptyEl);
	}

	card.appendChild(debugBtn);

	scroll.appendChild(card);
	return scroll;
}

function bindProfileStatusEditor(statusEl, i18n, initialValue = '', { maxLength = PROFILE_STATUS_TEXT_MAX, onCommit } = {}) {
	const placeholder = i18n.t('statusTextPlaceholder');
	let value = (initialValue || '').trim().slice(0, maxLength);

	const render = () => {
		statusEl.textContent = value || placeholder;
		statusEl.classList.toggle('mapp-profile-status-text--empty', !value);
	};

	statusEl.classList.add('mapp-profile-status-text--editable');
	statusEl.title = placeholder;
	render();

	statusEl.addEventListener('click', () => {
		if (statusEl.querySelector('input')) return;
		const prevValue = value;
		const input = document.createElement('input');
		input.type = 'text';
		input.className = 'mapp-profile-status-input';
		input.maxLength = maxLength;
		input.value = value;
		input.placeholder = placeholder;
		statusEl.textContent = '';
		statusEl.classList.add('mapp-profile-status-text--editing');
		statusEl.appendChild(input);
		input.focus();
		input.select();

		const finish = (save) => {
			const next = save ? input.value.trim().slice(0, maxLength) : prevValue;
			value = next;
			statusEl.classList.remove('mapp-profile-status-text--editing');
			input.remove();
			render();
			if (save && typeof onCommit === 'function' && next !== prevValue) onCommit(next);
		};

		const onBlur = () => finish(true);
		const onKeyDown = (e) => {
			if (e.key === 'Enter') {
				e.preventDefault();
				input.removeEventListener('blur', onBlur);
				input.removeEventListener('keydown', onKeyDown);
				finish(true);
			} else if (e.key === 'Escape') {
				e.preventDefault();
				input.removeEventListener('blur', onBlur);
				input.removeEventListener('keydown', onKeyDown);
				finish(false);
			}
		};
		input.addEventListener('blur', onBlur);
		input.addEventListener('keydown', onKeyDown);
	});

	const readValue = () => {
		const input = statusEl.querySelector('.mapp-profile-status-input');
		if (input) return input.value.trim();
		return value;
	};

	const commitPending = () => {
		const input = statusEl.querySelector('.mapp-profile-status-input');
		if (!input) return;
		value = input.value.trim();
		statusEl.classList.remove('mapp-profile-status-text--editing');
		input.remove();
		render();
	};

	return {
		getValue: readValue,
		commitPending,
		setValue: (next) => {
			const input = statusEl.querySelector('.mapp-profile-status-input');
			if (input) input.remove();
			statusEl.classList.remove('mapp-profile-status-text--editing');
			value = (next || '').trim();
			render();
		},
	};
}

const PROFILE_SETTINGS_AVATAR_SIZE = 96;

function openProfileAvatarFullscreen(src, { i18n, themeManager, icons, onEdit } = {}) {
	if (!src) return;

	let overlay = null;
	let popHandler = null;
	let keyHandler = null;
	let historyPushed = false;

	const resumeHistoryState = history.state;

	const finishClose = () => {
		if (!overlay) return;
		overlay.remove();
		overlay = null;
		activeProfileAvatarClose = null;
		if (popHandler) {
			window.removeEventListener('popstate', popHandler);
			popHandler = null;
		}
		if (keyHandler) {
			document.removeEventListener('keydown', keyHandler);
			keyHandler = null;
		}
		historyPushed = false;
	};

	const requestClose = () => {
		if (!overlay) return;
		if (historyPushed && history.state?.mappAvatarView) {
			try { history.back(); } catch (_) { finishClose(); }
			return;
		}
		finishClose();
	};

	overlay = document.createElement('div');
	overlay.className = 'mapp-avatar-viewer-overlay';
	if (themeManager) themeManager.applyChatVars(overlay);

	const img = document.createElement('img');
	img.className = 'mapp-avatar-viewer-img';
	img.alt = '';
	img.src = src;

	const toolbar = document.createElement('div');
	toolbar.className = 'mapp-avatar-viewer-toolbar';

	const editBtn = document.createElement('button');
	editBtn.type = 'button';
	editBtn.className = 'mapp-avatar-viewer-edit';
	editBtn.innerHTML = `${icons?.pencil?.() || ''}<span>${i18n?.t('editAvatar') || 'Изменить'}</span>`;
	editBtn.addEventListener('click', () => {
		finishClose();
		onEdit?.();
	});

	const closeBtn = document.createElement('button');
	closeBtn.type = 'button';
	closeBtn.className = 'mapp-avatar-viewer-close';
	closeBtn.innerHTML = icons?.closeBig?.() || '&times;';
	closeBtn.addEventListener('click', (e) => {
		e.stopPropagation();
		requestClose();
	});

	toolbar.append(editBtn);
	overlay.append(closeBtn, img, toolbar);
	document.body.appendChild(overlay);
	requestAnimationFrame(() => overlay.classList.add('mapp-avatar-viewer-overlay--visible'));

	overlay.addEventListener('click', (e) => {
		if (e.target === overlay) requestClose();
	});

	keyHandler = (e) => {
		if (e.key === 'Escape') requestClose();
	};
	document.addEventListener('keydown', keyHandler);

	if (resumeHistoryState) {
		history.pushState({ mappAvatarView: true }, '');
		historyPushed = true;
	}
	popHandler = () => finishClose();
	window.addEventListener('popstate', popHandler);
	activeProfileAvatarClose = () => finishClose();
}

const FOLDER_SVG_ICON_PREFIX = 'svg:';

const FOLDER_PRESET_SVG_KEYS = [
	'folder', 'chat', 'star', 'heart', 'bookmark', 'pin', 'bell', 'users',
	'user', 'search', 'trash', 'archive', 'shield', 'image', 'camera', 'paperclip',
];

const FOLDER_EMOJI_PRESETS = [
	'📁', '📂', '⭐', '❤️', '🔥', '💼', '🏠', '🎮', '📌', '🔔',
	'💬', '👥', '🎯', '✅', '📎', '🎵', '📷', '🛒', '✈️', '🎓',
	'💡', '📅', '🔒', '🌟', '🐾', '🍀', '⚽', '🎁', '💎', '🚀',
];

function firstGrapheme(str) {
	const s = (str || '').trim();
	if (!s) return '';
	try {
		if (typeof Intl.Segmenter !== 'undefined') {
			const seg = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
			const first = [...seg.segment(s)][0];
			return first?.segment || '';
		}
	} catch { /* ignore */ }
	return [...s][0] || '';
}

function encodeFolderSvgIcon(key) {
	return key ? `${FOLDER_SVG_ICON_PREFIX}${key}` : '';
}

function isFolderSvgIcon(icon) {
	return typeof icon === 'string' && icon.startsWith(FOLDER_SVG_ICON_PREFIX);
}

function getFolderSvgIconHtml(icon, icons) {
	if (!isFolderSvgIcon(icon) || !icons) return '';
	const key = icon.slice(FOLDER_SVG_ICON_PREFIX.length);
	const map = {
		folder: () => icons.folder(),
		chat: () => icons.chatBubble(),
		star: () => icons.star(),
		heart: () => icons.heart(),
		bookmark: () => icons.bookmark(),
		pin: () => icons.pin(),
		bell: () => icons.bell(),
		users: () => icons.groupUsers(),
		user: () => icons.user(),
		search: () => icons.search(),
		trash: () => icons.trash(),
		archive: () => icons.folder(),
		shield: () => icons.shieldBadge(),
		image: () => icons.imageThumb(),
		camera: () => icons.camera(),
		paperclip: () => icons.paperclip(),
	};
	return map[key]?.() || icons.folder();
}

function renderFolderIcon(el, icon, icons, { active = false } = {}) {
	if (!el || !icons) return;
	el.innerHTML = '';
	el.textContent = '';
	el.classList.remove('mapp-folder-tab-icon--emoji', 'mapp-folder-tab-icon--svg');
	if (!icon) {
		el.innerHTML = active ? icons.folder() : icons.folderGray();
		el.classList.add('mapp-folder-tab-icon--svg');
		return;
	}
	if (isFolderSvgIcon(icon)) {
		el.innerHTML = getFolderSvgIconHtml(icon, icons);
		el.classList.add('mapp-folder-tab-icon--svg');
	} else {
		el.textContent = icon;
		el.classList.add('mapp-folder-tab-icon--emoji');
	}
}

class MessengerFolderIconPicker {
	static #active = null;

	static close() {
		MessengerFolderIconPicker.#active?.();
		MessengerFolderIconPicker.#active = null;
	}

	static open({ value = '', icons, i18n, themeManager, onPick, onCancel } = {}) {
		MessengerFolderIconPicker.close();
		lockAppScroll();

		const overlay = document.createElement('div');
		overlay.className = 'mapp-modal-overlay mapp-folder-icon-picker-overlay';

		const card = document.createElement('div');
		card.className = 'mapp-folder-icon-picker';
		if (themeManager) {
			themeManager.applyChatVars(card);
			themeManager.applyAppVars(card);
		}

		const titleEl = document.createElement('div');
		titleEl.className = 'mapp-folder-icon-picker-title';
		titleEl.textContent = i18n?.t('folderIconPickerTitle') || 'Folder icon';

		const tabs = document.createElement('div');
		tabs.className = 'mapp-folder-icon-picker-tabs';
		const tabEmoji = document.createElement('button');
		tabEmoji.type = 'button';
		tabEmoji.className = 'mapp-modal-tab mapp-modal-tab--active';
		tabEmoji.textContent = i18n?.t('folderIconTabEmoji') || 'Emoji';
		const tabSvg = document.createElement('button');
		tabSvg.type = 'button';
		tabSvg.className = 'mapp-modal-tab';
		tabSvg.textContent = i18n?.t('folderIconTabSvg') || 'Icons';
		tabs.append(tabEmoji, tabSvg);

		const panelEmoji = document.createElement('div');
		panelEmoji.className = 'mapp-folder-icon-picker-panel';
		const emojiGrid = document.createElement('div');
		emojiGrid.className = 'mapp-folder-icon-picker-emoji-grid';
		FOLDER_EMOJI_PRESETS.forEach((emo) => {
			const btn = document.createElement('button');
			btn.type = 'button';
			btn.className = 'mapp-folder-icon-picker-cell';
			btn.textContent = emo;
			if (value === emo) btn.classList.add('mapp-folder-icon-picker-cell--active');
			btn.addEventListener('click', () => pick(emo));
			emojiGrid.appendChild(btn);
		});
		const customRow = document.createElement('div');
		customRow.className = 'mapp-folder-icon-picker-custom';
		const customLbl = document.createElement('span');
		customLbl.textContent = i18n?.t('folderIconCustomEmoji') || 'Custom';
		const customInput = document.createElement('input');
		customInput.type = 'text';
		customInput.className = 'mapp-folder-icon-picker-custom-input';
		customInput.maxLength = 8;
		customInput.placeholder = '😀';
		if (value && !isFolderSvgIcon(value)) customInput.value = value;
		const customApply = document.createElement('button');
		customApply.type = 'button';
		customApply.className = 'mapp-folder-icon-picker-custom-apply';
		customApply.textContent = 'OK';
		customApply.addEventListener('click', () => {
			const one = firstGrapheme(customInput.value);
			if (one) pick(one);
		});
		customInput.addEventListener('keydown', (e) => {
			if (e.key === 'Enter') {
				e.preventDefault();
				customApply.click();
			}
		});
		customRow.append(customLbl, customInput, customApply);
		panelEmoji.append(emojiGrid, customRow);

		const panelSvg = document.createElement('div');
		panelSvg.className = 'mapp-folder-icon-picker-panel';
		panelSvg.hidden = true;
		const svgGrid = document.createElement('div');
		svgGrid.className = 'mapp-folder-icon-picker-svg-grid';
		FOLDER_PRESET_SVG_KEYS.forEach((key) => {
			const encoded = encodeFolderSvgIcon(key);
			const btn = document.createElement('button');
			btn.type = 'button';
			btn.className = 'mapp-folder-icon-picker-cell mapp-folder-icon-picker-cell--svg';
			btn.innerHTML = getFolderSvgIconHtml(encoded, icons);
			if (value === encoded) btn.classList.add('mapp-folder-icon-picker-cell--active');
			btn.addEventListener('click', () => pick(encoded));
			svgGrid.appendChild(btn);
		});
		panelSvg.appendChild(svgGrid);

		const cancelBtn = document.createElement('button');
		cancelBtn.type = 'button';
		cancelBtn.className = 'mapp-folder-icon-picker-cancel';
		cancelBtn.textContent = i18n?.t('cancel') || 'Cancel';

		const close = () => {
			unlockAppScroll();
			overlay.remove();
			window.removeEventListener('keydown', onKey);
			MessengerFolderIconPicker.#active = null;
		};

		const pick = (icon) => {
			close();
			onPick?.(icon);
		};

		const setTab = (which) => {
			const emojiActive = which === 'emoji';
			tabEmoji.classList.toggle('mapp-modal-tab--active', emojiActive);
			tabSvg.classList.toggle('mapp-modal-tab--active', !emojiActive);
			panelEmoji.hidden = !emojiActive;
			panelSvg.hidden = emojiActive;
		};

		tabEmoji.addEventListener('click', () => setTab('emoji'));
		tabSvg.addEventListener('click', () => setTab('svg'));
		if (isFolderSvgIcon(value)) setTab('svg');
		else setTab('emoji');

		const onKey = (e) => {
			if (e.key === 'Escape') {
				close();
				onCancel?.();
			}
		};
		window.addEventListener('keydown', onKey);
		MessengerFolderIconPicker.#active = close;

		cancelBtn.addEventListener('click', () => { close(); onCancel?.(); });
		overlay.addEventListener('click', (e) => {
			if (e.target === overlay) { close(); onCancel?.(); }
		});

		card.append(titleEl, tabs, panelEmoji, panelSvg, cancelBtn);
		overlay.appendChild(card);
		document.body.appendChild(overlay);
	}
}

function buildFolderIconChooseRow({ utils, icons, i18n, themeManager, value, onChange }) {
	const row = utils.mk('div', 'mapp-folder-icon-choose-row');
	const label = utils.mk('div', 'mapp-section-label');
	label.textContent = i18n.t('folderIconLabel');
	const pickBtn = utils.mk('button', 'mapp-folder-icon-choose-btn');
	pickBtn.type = 'button';
	const preview = utils.mk('span', 'mapp-folder-icon-choose-preview');
	renderFolderIcon(preview, value, icons);
	const pickLbl = utils.mk('span', 'mapp-folder-icon-choose-label');
	pickLbl.textContent = i18n.t('folderIconChoose');
	pickBtn.append(preview, pickLbl);
	let current = value || '';
	pickBtn.addEventListener('click', () => {
		MessengerFolderIconPicker.open({
			value: current,
			icons,
			i18n,
			themeManager,
			onPick: (icon) => {
				current = icon;
				renderFolderIcon(preview, current, icons);
				onChange?.(current);
			},
		});
	});
	row.append(label, pickBtn);
	return { row, getValue: () => current, setValue: (v) => {
		current = v || '';
		renderFolderIcon(preview, current, icons);
	} };
}

function buildFolderSettingsPanel({ utils, icons, i18n, api, themeManager, onChanged, onOpenArchive, onCreateFolder }) {
	const section = utils.mk('div', 'mapp-folder-settings');
	const title = utils.mk('div', 'mapp-folder-settings-title');
	title.textContent = i18n.t('folderSettings');
	const hint = utils.mk('div', 'mapp-folder-settings-hint');
	hint.textContent = i18n.t('folderSettingsHint');
	const openArchiveBtn = utils.mk('button', 'mapp-btn mapp-btn-secondary mapp-btn-block mapp-btn-settings-wide mapp-folder-settings-archive-btn');
	openArchiveBtn.type = 'button';
	openArchiveBtn.textContent = i18n.t('openArchive');
	openArchiveBtn.addEventListener('click', () => onOpenArchive?.());
	const list = utils.mk('div', 'mapp-folder-settings-list');
	section.append(title, hint, openArchiveBtn, list);

	let folders = [];

	const render = () => {
		list.innerHTML = '';
		if (!folders.length) {
			const empty = utils.mk('div', 'mapp-list-empty');
			empty.textContent = i18n.t('noFolders');
			list.appendChild(empty);
		} else {
		folders.forEach((folder, index) => {
			const row = utils.mk('div', 'mapp-folder-settings-item');
			row.draggable = true;
			row.dataset.folderId = folder.id;
			const grip = utils.mk('span', 'mapp-folder-settings-grip');
			grip.textContent = '⋮⋮';
			const ic = utils.mk('span', 'mapp-folder-settings-icon mapp-folder-settings-icon--pick');
			ic.title = i18n.t('folderIconChoose');
			renderFolderIcon(ic, folder.icon, icons);
			ic.addEventListener('click', () => {
				MessengerFolderIconPicker.open({
					value: folder.icon || '',
					icons,
					i18n,
					themeManager,
					onPick: async (newIcon) => {
						try {
							await api.saveFolder(folder.name, newIcon || '', folder.id);
							folder.icon = newIcon;
							renderFolderIcon(ic, folder.icon, icons);
							await reload();
							onChanged?.();
						} catch (e) {
							console.warn('[FolderSettings] icon error', e);
						}
					},
				});
			});
			const nameEl = utils.mk('span', 'mapp-folder-settings-name');
			nameEl.textContent = folder.name;
			nameEl.title = i18n.t('folderRename');
			nameEl.addEventListener('click', () => {
				if (nameEl.isContentEditable) return;
				const prevName = folder.name;
				nameEl.contentEditable = 'true';
				nameEl.classList.add('mapp-folder-settings-name--editing');
				nameEl.focus();
				const range = document.createRange();
				range.selectNodeContents(nameEl);
				const sel = window.getSelection();
				sel?.removeAllRanges();
				sel?.addRange(range);

				const finish = async (save) => {
					if (!nameEl.isContentEditable) return;
					nameEl.contentEditable = 'false';
					nameEl.classList.remove('mapp-folder-settings-name--editing');
					const next = nameEl.textContent.trim();
					if (!save || !next || next === prevName) {
						nameEl.textContent = prevName;
						return;
					}
					try {
						await api.saveFolder(next, folder.icon || '', folder.id);
						folder.name = next;
						await reload();
						onChanged?.();
					} catch (e) {
						console.warn('[FolderSettings] rename error', e);
						nameEl.textContent = prevName;
					}
				};

				const onBlur = () => finish(true);
				const onKeyDown = (e) => {
					if (e.key === 'Enter') {
						e.preventDefault();
						nameEl.removeEventListener('blur', onBlur);
						nameEl.removeEventListener('keydown', onKeyDown);
						finish(true);
					} else if (e.key === 'Escape') {
						e.preventDefault();
						nameEl.removeEventListener('blur', onBlur);
						nameEl.removeEventListener('keydown', onKeyDown);
						finish(false);
					}
				};
				nameEl.addEventListener('blur', onBlur);
				nameEl.addEventListener('keydown', onKeyDown);
			});
			const deleteBtn = utils.mk('button', 'mapp-folder-settings-delete');
			deleteBtn.type = 'button';
			deleteBtn.innerHTML = icons.close();
			deleteBtn.title = i18n.t('folderDelete');
			deleteBtn.addEventListener('click', async () => {
				const confirmed = await MessengerDialog.confirm({
					title: i18n.t('folderDelete'),
					message: i18n.t('folderDeleteConfirm').replace('{name}', folder.name),
					type: MessengerDialog.TYPE_DANGER,
					confirmLabel: i18n.t('confirm'),
					cancelLabel: i18n.t('cancel'),
					themeManager,
				});
				if (!confirmed) return;
				try {
					await api.deleteFolder(folder.id);
					await reload();
					onChanged?.();
				} catch (e) {
					console.warn('[FolderSettings] delete error', e);
				}
			});
			row.append(grip, ic, nameEl, deleteBtn);
			row.addEventListener('dragstart', e => {
				row.classList.add('mapp-folder-settings-item--dragging');
				e.dataTransfer.setData('text/plain', folder.id);
			});
			row.addEventListener('dragend', () => row.classList.remove('mapp-folder-settings-item--dragging'));
			row.addEventListener('dragover', e => { e.preventDefault(); row.classList.add('mapp-folder-settings-item--over'); });
			row.addEventListener('dragleave', () => row.classList.remove('mapp-folder-settings-item--over'));
			row.addEventListener('drop', async e => {
				e.preventDefault();
				row.classList.remove('mapp-folder-settings-item--over');
				const fromId = e.dataTransfer.getData('text/plain');
				if (!fromId || fromId === folder.id) return;
				const fromIdx = folders.findIndex(f => f.id === fromId);
				const toIdx = folders.findIndex(f => f.id === folder.id);
				if (fromIdx < 0 || toIdx < 0) return;
				const [moved] = folders.splice(fromIdx, 1);
				folders.splice(toIdx, 0, moved);
				render();
				try {
					await api.reorderFolders(folders.map(f => f.id));
					onChanged?.();
				} catch (err) {
					console.warn('[FolderSettings] reorder error', err);
					await reload();
				}
			});
			list.appendChild(row);
		});
		}
		const createBtn = utils.mk('button', 'mapp-btn mapp-btn-primary mapp-btn-block mapp-btn-settings-wide mapp-folder-settings-create-btn');
		createBtn.type = 'button';
		createBtn.textContent = i18n.t('createFolder');
		createBtn.addEventListener('click', async () => {
			try {
				await onCreateFolder?.();
			} finally {
				await reload();
			}
		});
		list.appendChild(createBtn);
	};

	const reload = async () => {
		try {
			const data = await api.getFolders();
			folders = (data.folders || []).slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
			folders = folders.filter(f => !f.isArchive);
			render();
		} catch (e) {
			console.warn('[FolderSettings] load error', e);
		}
	};

	reload();
	if (themeManager) {
		themeManager.applyChatVars(section);
		themeManager.applyAppVars(section);
	}
	return section;
}

function buildMessengerAppSettingsMenuItems({
	themeManager,
	icons,
	i18n,
	targetRootEl,
	getPanelEl,
	getMenuEl,
	onClearCache,
	onClearAll,
	includeTheme = true,
}) {
	const onThemePick = (theme) => {
		themeManager.applyTheme(theme);
		themeManager.refreshDom(targetRootEl, getPanelEl?.());
		const menuEl = getMenuEl?.();
		if (menuEl) themeManager.syncThemeSubmenu(menuEl);
	};

	const themeSubmenuItems = themeManager.themes.map(theme => ({
		id: theme.name,
		labelKey: theme.name,
		active: theme.name === themeManager.current.name,
		action: () => onThemePick(theme),
	}));

	const items = [];
	if (includeTheme) {
		items.push({
			id: 'theme',
			labelKey: 'theme',
			icon: icons.theme(),
			submenu: themeSubmenuItems,
		});
	}

	const pushApi = typeof window !== 'undefined' ? window.SupraPush : null;
	if (pushApi && pushApi.isSupported && pushApi.isSupported()) {
		const notifyAlert = (message, type) => MessengerDialog.alert({
			title: i18n.t('notifications'),
			message,
			type,
			confirmLabel: i18n.t('confirm'),
			themeManager,
		});
		items.push({
			id: 'notifications',
			labelKey: 'notifications',
			icon: icons.bell(),
			action: async () => {
				let status;
				try {
					status = await pushApi.getStatus();
				} catch (_) {
					notifyAlert(i18n.t('notificationsFailed'), MessengerDialog.TYPE_WARNING);
					return;
				}
				if (!status.supported) {
					notifyAlert(i18n.t('notificationsUnsupported'), MessengerDialog.TYPE_WARNING);
					return;
				}
				if (status.permission === 'denied') {
					notifyAlert(i18n.t('notificationsDenied'), MessengerDialog.TYPE_WARNING);
					return;
				}
				if (status.subscribed) {
					const confirmed = await MessengerDialog.confirm({
						title: i18n.t('notificationsDisableTitle'),
						message: i18n.t('notificationsDisableMsg'),
						type: MessengerDialog.TYPE_WARNING,
						confirmLabel: i18n.t('confirm'),
						cancelLabel: i18n.t('cancel'),
						themeManager,
					});
					if (!confirmed) return;
					await pushApi.disable();
					notifyAlert(i18n.t('notificationsDisabledOk'), MessengerDialog.TYPE_SUCCESS);
					return;
				}
				const confirmed = await MessengerDialog.confirm({
					title: i18n.t('notificationsEnableTitle'),
					message: i18n.t('notificationsEnableMsg'),
					type: MessengerDialog.TYPE_INFO,
					confirmLabel: i18n.t('confirm'),
					cancelLabel: i18n.t('cancel'),
					themeManager,
				});
				if (!confirmed) return;
				const res = await pushApi.enable();
				if (res.ok) {
					notifyAlert(i18n.t('notificationsEnabledOk'), MessengerDialog.TYPE_SUCCESS);
				} else if (res.reason === 'denied') {
					notifyAlert(i18n.t('notificationsDenied'), MessengerDialog.TYPE_WARNING);
				} else if (res.reason === 'unsupported') {
					notifyAlert(i18n.t('notificationsUnsupported'), MessengerDialog.TYPE_WARNING);
				} else if (res.reason !== 'dismissed') {
					notifyAlert(i18n.t('notificationsFailed'), MessengerDialog.TYPE_WARNING);
				}
			},
		});
	}

	items.push(
		{
			id: 'clearCache',
			labelKey: 'clearCache',
			icon: icons.clearCache(),
			action: () => {
				MessengerDialog.confirm({
					title: i18n.t('clearCacheConfirmTitle'),
					message: i18n.t('clearCacheConfirmMsg'),
					type: MessengerDialog.TYPE_WARNING,
					confirmLabel: i18n.t('confirm'),
					cancelLabel: i18n.t('cancel'),
					themeManager,
				}).then(confirmed => {
					if (confirmed) {
						onClearCache().then(() => {
							MessengerDialog.alert({
								title: i18n.t('cacheCleared'),
								type: MessengerDialog.TYPE_SUCCESS,
								confirmLabel: i18n.t('confirm'),
								themeManager,
							});
						});
					}
				});
			},
		},
		{
			id: 'clearAll',
			labelKey: 'clearAllCache',
			danger: true,
			icon: icons.clearAll(),
			action: () => {
				MessengerDialog.confirm({
					title: i18n.t('clearAllConfirmTitle'),
					message: i18n.t('clearAllConfirmMsg'),
					type: MessengerDialog.TYPE_DANGER,
					confirmLabel: i18n.t('confirm'),
					cancelLabel: i18n.t('cancel'),
					themeManager,
				}).then(confirmed => {
					if (confirmed) {
						onClearAll().then(() => {
							MessengerDialog.alert({
								title: i18n.t('cacheCleared'),
								type: MessengerDialog.TYPE_SUCCESS,
								confirmLabel: i18n.t('confirm'),
								themeManager,
							});
						});
					}
				});
			},
		},
	);
	return items;
}

class MessengerSettingsModal {
	#utils;
	#icons;
	#i18n;
	#themeManager;
	#menuBuilder;
	#api;
	#onClearCache;
	#onClearAll;
	#onFoldersChanged;
	#onOpenArchive;
	#onCreateFolder;
	#closeOverlay = null;

	constructor(utils, icons, i18n, themeManager, menuBuilder, onClearCache, onClearAll, api = null, onFoldersChanged = null, onOpenArchive = null, onCreateFolder = null) {
		this.#utils = utils;
		this.#icons = icons;
		this.#i18n = i18n;
		this.#themeManager = themeManager;
		this.#menuBuilder = menuBuilder;
		this.#onClearCache = onClearCache;
		this.#onClearAll = onClearAll;
		this.#api = api;
		this.#onFoldersChanged = onFoldersChanged;
		this.#onOpenArchive = onOpenArchive;
		this.#onCreateFolder = onCreateFolder;
	}

	open(targetRootEl) {
		if (this.#closeOverlay) this.close();

		let panelEl = null;
		let menuEl = null;
		const menuItems = buildMessengerAppSettingsMenuItems({
			themeManager: this.#themeManager,
			icons: this.#icons,
			i18n: this.#i18n,
			targetRootEl,
			getPanelEl: () => panelEl,
			getMenuEl: () => menuEl,
			onClearCache: () => this.#onClearCache(),
			onClearAll: () => this.#onClearAll(),
		});

		menuEl = this.#menuBuilder.buildMenu(menuItems, targetRootEl);
		menuEl.classList.add('mapp-settings-action-menu');
		const content = this.#utils.mk('div', 'mapp-settings-content');
		const settingsMenuCard = mkUiCard(this.#i18n.t('appSettings'));
		settingsMenuCard.appendChild(menuEl);
		content.appendChild(settingsMenuCard);
		if (this.#api) {
			content.appendChild(buildFolderSettingsPanel({
				utils: this.#utils,
				icons: this.#icons,
				i18n: this.#i18n,
				api: this.#api,
				themeManager: this.#themeManager,
				onChanged: () => this.#onFoldersChanged?.(),
				onOpenArchive: () => this.#onOpenArchive?.(),
				onCreateFolder: () => this.#onCreateFolder?.(),
			}));
		}
		panelEl = this.#menuBuilder.buildWindow(
			this.#i18n.t('settings'),
			content,
			() => this.close()
		);
		panelEl.classList.add('mc-panel-window--settings');

		this.#themeManager.applyChatVars(panelEl);
		this.#themeManager.applyAppVars(panelEl);

		this.#closeOverlay = this.#menuBuilder.openInOverlay(panelEl, '', { mobileFullscreen: true });
	}

	close() {
		if (this.#closeOverlay) {
			this.#closeOverlay();
			this.#closeOverlay = null;
		}
		unlockAppScroll();
	}
}

class MessengerUserProfileModal {
	#utils;
	#icons;
	#i18n;
	#themeManager;
	#menuBuilder;
	#avatarBuilder;
	#onClearCache;
	#onClearAll;
	#closeOverlay = null;
	#popHandler = null;
	#navDepth = 0;
	#closing = false;

	constructor(utils, icons, i18n, themeManager, menuBuilder, avatarBuilder, onClearCache, onClearAll) {
		this.#utils = utils;
		this.#icons = icons;
		this.#i18n = i18n;
		this.#themeManager = themeManager;
		this.#menuBuilder = menuBuilder;
		this.#avatarBuilder = avatarBuilder;
		this.#onClearCache = onClearCache;
		this.#onClearAll = onClearAll;
	}

	async open(targetRootEl, user, callbacks = {}) {
		this.close();
		let profile;
		try {
			const r = await fetch('/api/profile', { credentials: 'same-origin' });
			if (!r.ok) throw new Error('HTTP ' + r.status);
			profile = await r.json();
		} catch (e) {
			MessengerDialog.alert({
				title: this.#i18n.t('loadProfileError'),
				message: e.message || '',
				type: MessengerDialog.TYPE_DANGER,
				themeManager: this.#themeManager,
			});
			return;
		}

		callbacks.onUserUpdated?.({
			...user,
			name: profile.displayName || user.name,
			statusText: profile.statusText != null ? String(profile.statusText).trim() : (user.statusText || ''),
			avatar: profile.avatar ?? user.avatar ?? null,
		});

		const wrap = document.createElement('div');
		wrap.className = 'mapp-profile-window-content';

		const viewsEl = document.createElement('div');
		viewsEl.className = 'mapp-settings-views';

		const mkView = (viewId) => {
			const panel = document.createElement('div');
			panel.className = 'mapp-profile-tab-panel mapp-settings-view';
			panel.dataset.view = viewId;
			panel.hidden = viewId !== 'home';
			return panel;
		};

		const homeView = mkView('home');
		const accountView = mkView('account');
		const pwdPanel = mkView('password');
		const privacyPanel = mkView('privacy');
		const invitesPanel = mkView('invites');
		const chatSettingsPanel = mkView('chatSettings');
		const foldersPanel = mkView('folders');
		const aboutPanel = mkView('about');
		const helpPanel = mkView('help');
		const settingsPanel = mkView('settings');
		settingsPanel.classList.add('mapp-profile-tab-panel--menu');

		const appRoot = typeof globalThis !== 'undefined' ? globalThis : window;
		let branding = appRoot.__appBranding;
		if (!branding && appRoot.AppBranding?.loadAppearance) {
			branding = await appRoot.AppBranding.loadAppearance();
		}
		branding = branding || {};

		let currentView = 'home';
		const viewTitles = {
			home: this.#i18n.t('settings'),
			account: this.#i18n.t('accountTab'),
			password: this.#i18n.t('securityTab'),
			privacy: this.#i18n.t('privacy'),
			invites: this.#i18n.t('invitationsTab'),
			chatSettings: this.#i18n.t('chatSettingsTab'),
			folders: this.#i18n.t('foldersTab'),
			about: this.#i18n.t('aboutAppTab'),
			help: this.#i18n.t('helpTab'),
			settings: this.#i18n.t('appSettings'),
		};

		const allViews = [
			homeView, accountView, pwdPanel, privacyPanel, invitesPanel,
			chatSettingsPanel, foldersPanel, aboutPanel, helpPanel, settingsPanel,
		];

		const showView = (viewId) => {
			currentView = viewId;
			allViews.forEach(v => { v.hidden = v.dataset.view !== viewId; });
			if (viewId === 'invites') loadInvitations();
		};

		const mkStatusMsg = () => {
			const el = document.createElement('div');
			el.className = 'mapp-profile-status-msg';
			el.hidden = true;
			return el;
		};

		const showStatus = (el, text, ok) => {
			el.hidden = false;
			MessengerUtils.setStatusTone(el, ok);
			el.textContent = text;
		};

		const privacyScroll = document.createElement('div');
		privacyScroll.className = 'mapp-profile-tab-scroll mapp-profile-form-page';

		const privacyCard = mkUiCard(this.#i18n.t('privacy'));

		const { row: searchableByLoginRow, input: searchableByLoginChk } = mkToggleField(
			this.#i18n.t('searchableByLogin'),
			{ checked: profile.searchableByLogin !== false },
		);
		const { row: searchableByNameRow, input: searchableByNameChk } = mkToggleField(
			this.#i18n.t('searchableByName'),
			{ checked: !!profile.searchableByName },
		);

		const allowInviteRow = mkPrivacyRow(this.#i18n.t('allowInviteLabel'), this.#i18n, profile.allowInvite);
		const showOnlineStatusRow = mkPrivacyRow(this.#i18n.t('showOnlineStatusLabel'), this.#i18n, profile.showOnlineStatus);
		const allowWriteRow = mkPrivacyRow(this.#i18n.t('allowWriteLabel'), this.#i18n, profile.allowWrite);

		privacyCard.append(
			searchableByLoginRow,
			searchableByNameRow,
			allowInviteRow.row,
			showOnlineStatusRow.row,
			allowWriteRow.row,
		);
		privacyScroll.appendChild(privacyCard);

		const privacyMsg = mkStatusMsg();
		privacyScroll.appendChild(privacyMsg);
		const savePrivacy = async () => {
			const r = await fetch('/api/profile/privacy', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'same-origin',
				body: JSON.stringify({
					searchableByLogin: searchableByLoginChk.checked,
					searchableByName: searchableByNameChk.checked,
					allowInvite: allowInviteRow.sel.value,
					showOnlineStatus: showOnlineStatusRow.sel.value,
					allowWrite: allowWriteRow.sel.value,
				}),
			});
			if (!r.ok) showStatus(privacyMsg, 'Error', false);
			else showStatus(privacyMsg, this.#i18n.t('saved'), true);
		};
		searchableByLoginChk.addEventListener('change', savePrivacy);
		searchableByNameChk.addEventListener('change', savePrivacy);
		allowInviteRow.sel.addEventListener('change', savePrivacy);
		showOnlineStatusRow.sel.addEventListener('change', savePrivacy);
		allowWriteRow.sel.addEventListener('change', savePrivacy);
		privacyPanel.appendChild(privacyScroll);
		viewsEl.appendChild(privacyPanel);

		const invitesScroll = document.createElement('div');
		invitesScroll.className = 'mapp-profile-tab-scroll mapp-profile-form-page';
		const invitesCard = mkUiCard(this.#i18n.t('invitationsTab'));
		const invitesHint = document.createElement('div');
		invitesHint.className = 'mapp-input-hint mapp-group-section-hint';
		invitesHint.textContent = this.#i18n.t('invitationsHint');
		const invitesCountEl = document.createElement('div');
		invitesCountEl.className = 'mapp-invites-count';
		const invitesListEl = document.createElement('div');
		invitesListEl.className = 'mapp-invites-list';
		const invitesMsg = mkStatusMsg();
		const invitesGenBtn = document.createElement('button');
		invitesGenBtn.type = 'button';
		invitesGenBtn.className = 'mapp-btn mapp-btn-primary mapp-btn-block mapp-btn-settings-wide mapp-invites-generate-btn';
		invitesGenBtn.textContent = this.#i18n.t('invitationsGenerate');
		invitesCard.append(invitesHint, invitesCountEl, invitesListEl, invitesMsg, invitesGenBtn);
		invitesScroll.appendChild(invitesCard);
		invitesPanel.appendChild(invitesScroll);
		viewsEl.appendChild(invitesPanel);

		const formatInviteExpiry = (iso) => {
			if (!iso) return '';
			const d = new Date(iso);
			if (Number.isNaN(d.getTime())) return '';
			return d.toLocaleString(undefined, { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
		};

		const copyInviteLink = async (link) => {
			try {
				await navigator.clipboard.writeText(link);
				showStatus(invitesMsg, this.#i18n.t('invitationsCopied'), true);
			} catch {
				showStatus(invitesMsg, 'Error', false);
			}
		};

		const renderInvitations = (data) => {
			const maxActive = data?.maxActive ?? 5;
			const activeCount = data?.activeCount ?? 0;
			invitesCountEl.textContent = this.#i18n.t('invitationsCount', activeCount, maxActive);
			invitesGenBtn.disabled = data?.canCreate === false;
			invitesGenBtn.title = data?.canCreate === false ? this.#i18n.t('invitationsLimit') : '';
			invitesListEl.innerHTML = '';
			const items = data?.invitations || [];
			if (!items.length) {
				const empty = document.createElement('div');
				empty.className = 'mapp-list-empty';
				empty.textContent = this.#i18n.t('invitationsEmpty');
				invitesListEl.appendChild(empty);
				return;
			}
			items.forEach(item => {
				const row = document.createElement('div');
				row.className = 'mapp-invite-row';
				const meta = document.createElement('div');
				meta.className = 'mapp-invite-row-meta';
				const status = document.createElement('div');
				status.className = 'mapp-invite-status';
				status.textContent = this.#i18n.t('invitationsActive');
				const expires = document.createElement('div');
				expires.className = 'mapp-invite-expires';
				expires.textContent = `${this.#i18n.t('invitationsExpires')}: ${formatInviteExpiry(item.expiresOn)}`;
				const linkEl = document.createElement('div');
				linkEl.className = 'mapp-invite-link mapp-selectable-text';
				linkEl.textContent = item.link;
				meta.append(status, expires, linkEl);
				const actions = document.createElement('div');
				actions.className = 'mapp-invite-actions';
				const copyBtn = document.createElement('button');
				copyBtn.type = 'button';
				copyBtn.className = 'mapp-invite-action-btn';
				copyBtn.title = this.#i18n.t('invitationsCopy');
				copyBtn.innerHTML = this.#icons.copy();
				copyBtn.addEventListener('click', () => copyInviteLink(item.link));
				const qrBtn = document.createElement('button');
				qrBtn.type = 'button';
				qrBtn.className = 'mapp-invite-action-btn';
				qrBtn.title = this.#i18n.t('invitationsQr');
				qrBtn.innerHTML = this.#icons.qrCode();
				qrBtn.addEventListener('click', () => {
					MessengerQrDialog.show({
						link: item.link,
						title: this.#i18n.t('qrInviteTitle'),
						i18n: this.#i18n,
						themeManager: this.#themeManager,
					});
				});
				actions.append(copyBtn, qrBtn);
				row.append(meta, actions);
				invitesListEl.appendChild(row);
			});
		};

		const loadInvitations = async () => {
			if (user.userType === 'Admin') {
				invitesHint.textContent = '';
				invitesCountEl.textContent = '';
				invitesGenBtn.hidden = true;
				invitesListEl.innerHTML = '';
				const empty = document.createElement('div');
				empty.className = 'mapp-list-empty';
				empty.textContent = this.#i18n.t('adminPanel');
				invitesListEl.appendChild(empty);
				return;
			}
			invitesGenBtn.hidden = false;
			try {
				const r = await fetch('/api/profile/invitations', { credentials: 'same-origin' });
				const data = await r.json().catch(() => ({}));
				if (!r.ok) throw new Error(data.error || 'HTTP ' + r.status);
				renderInvitations(data);
			} catch (e) {
				showStatus(invitesMsg, e.message || 'Error', false);
			}
		};

		invitesGenBtn.addEventListener('click', async () => {
			invitesMsg.hidden = true;
			try {
				const r = await fetch('/api/profile/invitations', { method: 'POST', credentials: 'same-origin' });
				const data = await r.json().catch(() => ({}));
				if (!r.ok) throw new Error(data.error || 'HTTP ' + r.status);
				await loadInvitations();
			} catch (e) {
				showStatus(invitesMsg, e.message || 'Error', false);
				await loadInvitations();
			}
		});

		let autosaveTimer = null;

		const hub = document.createElement('div');
		hub.className = 'mapp-settings-hub';

		const avatarSlot = document.createElement('div');
		avatarSlot.className = 'mapp-settings-hub-avatar mapp-profile-head-avatar--editable';
		avatarSlot.title = this.#i18n.t('changePhoto');
		const cameraBadge = document.createElement('span');
		cameraBadge.className = 'mapp-avatar-camera-badge';
		cameraBadge.innerHTML = this.#icons.camera();
		cameraBadge.title = this.#i18n.t('changePhoto');

		const headName = document.createElement('div');
		headName.className = 'mapp-settings-hub-name mapp-sidebar-username mapp-selectable-text';
		headName.textContent = profile.displayName || user.name || '';

		const headLogin = document.createElement('div');
		headLogin.className = 'mapp-settings-hub-login mapp-chat-item-preview mapp-selectable-text';
		headLogin.textContent = '@' + (profile.login || user.login || '');

		const hubStatusEl = document.createElement('div');
		hubStatusEl.className = 'mapp-profile-status-text';
		let statusEditor = null;

		const emailInput = document.createElement('input');
		emailInput.type = 'email';
		emailInput.name = 'email';
		emailInput.value = profile.email || '';

		const phoneInput = document.createElement('input');
		phoneInput.type = 'tel';
		phoneInput.name = 'phone';
		phoneInput.value = profile.phone || '';

		let pendingPhotoFile = null;
		let avatarPreviewUrl = null;

		const displayNameInput = document.createElement('input');
		displayNameInput.type = 'text';
		displayNameInput.className = 'mapp-profile-field-input';
		displayNameInput.value = profile.displayName || user.name || '';
		displayNameInput.required = true;

		const aboutInput = document.createElement('textarea');
		aboutInput.className = 'mapp-profile-field-input';
		aboutInput.rows = 3;
		aboutInput.maxLength = PROFILE_ABOUT_TEXT_MAX;
		aboutInput.placeholder = this.#i18n.t('aboutMePlaceholder');
		aboutInput.value = profile.aboutText || '';

		const getDisplayName = () =>
			displayNameInput.value.trim()
			|| (headName.textContent || '').trim()
			|| profile.displayName
			|| user.name
			|| '';

		const applyUserUpdated = async () => {
			const me = await fetch('/api/auth/me', { credentials: 'same-origin' }).then((x) => x.json());
			const freshProfile = await fetch('/api/profile', { credentials: 'same-origin' })
				.then((x) => (x.ok ? x.json() : null))
				.catch(() => null);
			const savedStatus = (freshProfile?.statusText ?? statusEditor?.getValue() ?? '').trim();
			const savedAbout = (freshProfile?.aboutText ?? aboutInput.value.trim()).trim();
			profile.displayName = getDisplayName();
			headName.textContent = profile.displayName;
			if (freshProfile) {
				profile.statusText = freshProfile.statusText ?? savedStatus;
				profile.aboutText = freshProfile.aboutText ?? savedAbout;
			}
			statusEditor?.setValue(profile.statusText || '');
			aboutInput.value = profile.aboutText || '';
			const nextAvatar = freshProfile?.avatar ?? me.avatar ?? null;
			profile.avatar = nextAvatar;
			user.avatar = nextAvatar;
			pendingPhotoFile = null;
			if (avatarPreviewUrl) {
				URL.revokeObjectURL(avatarPreviewUrl);
				avatarPreviewUrl = null;
			}
			rebuildAvatarSlot(nextAvatar);
			callbacks.onUserUpdated?.({
				...user,
				name: me.name || profile.displayName,
				login: me.login,
				avatar: nextAvatar,
				userType: me.userType || user.userType,
				statusText: savedStatus,
			});
		};

		const persistProfile = async (partial = {}, statusEl = null) => {
			statusEditor?.commitPending();
			const name = partial.displayName ?? getDisplayName();
			if (!name) {
				setProfileFieldValidation(displayNameField, 'err', this.#i18n.t('displayNameRequired'));
				if (statusEl) showStatus(statusEl, this.#i18n.t('displayNameRequired'), false);
				return false;
			}
			const fd = new FormData();
			fd.append('displayName', name);
			fd.append('email', partial.email ?? emailInput.value.trim());
			fd.append('phone', partial.phone ?? phoneInput.value.trim());
			fd.append('statusText', partial.statusText ?? (statusEditor?.getValue() ?? profile.statusText ?? '').trim());
			fd.append('aboutText', partial.aboutText ?? aboutInput.value.trim());
			if (partial.photo) fd.append('photo', partial.photo);
			const r = await fetch('/api/profile', { method: 'PUT', body: fd, credentials: 'same-origin' });
			const j = await r.json().catch(() => ({}));
			if (!r.ok) {
				if (statusEl) showStatus(statusEl, j.error || 'Error', false);
				return false;
			}
			if (statusEl) showStatus(statusEl, this.#i18n.t('saved'), true);
			await applyUserUpdated();
			return true;
		};

		const scheduleProfileAutosave = (statusEl) => {
			clearTimeout(autosaveTimer);
			autosaveTimer = setTimeout(() => persistProfile({}, statusEl), 700);
		};

		const rebuildAvatarSlot = (avatarUrl) => {
			avatarSlot.innerHTML = '';
			avatarSlot.appendChild(
				this.#avatarBuilder.build(
					user.colorSeed || 'me',
					getDisplayName(),
					avatarUrl || null,
					PROFILE_SETTINGS_AVATAR_SIZE
				)
			);
			avatarSlot.appendChild(cameraBadge);
		};

		const getAvatarSrc = () => {
			if (avatarPreviewUrl) return avatarPreviewUrl;
			return profile.avatar || user.avatar || '';
		};

		const hasProfilePhoto = () => !!(pendingPhotoFile || profile.avatar || user.avatar);

		rebuildAvatarSlot(getAvatarSrc());

		const applyProfilePhoto = async (f) => {
			if (!f) return;
			const compressed = await compressImageFile(f, AVATAR_MAX_DIMENSION);
			if (avatarPreviewUrl) URL.revokeObjectURL(avatarPreviewUrl);
			avatarPreviewUrl = URL.createObjectURL(compressed);
			rebuildAvatarSlot(avatarPreviewUrl);
			await persistProfile({ photo: compressed }, profileMsg);
		};

		const pickAvatar = () => openAvatarSourcePicker({
			i18n: this.#i18n,
			themeManager: this.#themeManager,
			icons: this.#icons,
			cropOutputSize: AVATAR_MAX_DIMENSION,
			onPick: applyProfilePhoto,
		});

		avatarSlot.addEventListener('click', () => {
			if (hasProfilePhoto()) {
				openProfileAvatarFullscreen(getAvatarSrc(), {
					i18n: this.#i18n,
					themeManager: this.#themeManager,
					icons: this.#icons,
					onEdit: pickAvatar,
				});
			} else {
				pickAvatar();
			}
		});

		const navList = document.createElement('nav');
		navList.className = 'mapp-settings-nav-list';
		const mkNavRow = (label, viewId) => {
			const row = document.createElement('button');
			row.type = 'button';
			row.className = 'mapp-settings-nav-item';
			row.dataset.view = viewId;
			const lbl = document.createElement('span');
			lbl.className = 'mapp-settings-nav-label';
			lbl.textContent = label;
			const chev = document.createElement('span');
			chev.className = 'mapp-settings-nav-chevron';
			chev.setAttribute('aria-hidden', 'true');
			chev.textContent = '›';
			row.append(lbl, chev);
			return row;
		};

		navList.append(
			mkNavRow(this.#i18n.t('accountTab'), 'account'),
			mkNavRow(this.#i18n.t('securityTab'), 'password'),
			mkNavRow(this.#i18n.t('privacy'), 'privacy'),
			mkNavRow(this.#i18n.t('invitationsTab'), 'invites'),
			mkNavRow(this.#i18n.t('chatSettingsTab'), 'chatSettings'),
			mkNavRow(this.#i18n.t('foldersTab'), 'folders'),
			mkNavRow(this.#i18n.t('aboutAppTab'), 'about'),
			mkNavRow(this.#i18n.t('helpTab'), 'help'),
			mkNavRow(this.#i18n.t('appSettings'), 'settings'),
		);
		const navCard = mkUiCard();
		navCard.classList.add('mapp-settings-nav-card');
		navCard.appendChild(navList);

		const profileMsg = mkStatusMsg();
		profileMsg.hidden = true;
		statusEditor = bindProfileStatusEditor(
			hubStatusEl,
			this.#i18n,
			profile.statusText || user.statusText || '',
			{
				onCommit: () => scheduleProfileAutosave(profileMsg),
			},
		);
		hub.append(avatarSlot, headName, headLogin, hubStatusEl, profileMsg, navCard);
		homeView.appendChild(hub);

		const accountScroll = document.createElement('div');
		accountScroll.className = 'mapp-profile-tab-scroll mapp-profile-form-page';
		const accountForm = document.createElement('div');
		accountForm.className = 'mapp-profile-account-form';
		const accountCard = mkUiCard(this.#i18n.t('accountTab'));

		const accountMsg = mkStatusMsg();

		const loginChangeWrap = document.createElement('div');
		loginChangeWrap.className = 'mapp-profile-login-change-wrap';
		const loginDisplayRow = document.createElement('div');
		loginDisplayRow.className = 'mapp-profile-login-display-row';
		const loginDisplay = document.createElement('div');
		loginDisplay.className = 'mapp-profile-login-display mapp-selectable-text';
		loginDisplay.textContent = '@' + (profile.login || user.login || '');
		const changeLoginBtn = document.createElement('button');
		changeLoginBtn.type = 'button';
		changeLoginBtn.className = 'mapp-btn mapp-btn-secondary mapp-profile-login-change-btn';
		changeLoginBtn.textContent = this.#i18n.t('changeLogin');
		loginDisplayRow.append(loginDisplay, changeLoginBtn);
		const loginCooldownHint = document.createElement('div');
		loginCooldownHint.className = 'mapp-input-hint mapp-profile-login-cooldown-hint';
		loginCooldownHint.hidden = true;
		loginChangeWrap.append(loginDisplayRow, loginCooldownHint);

		let canChangeLogin = profile.canChangeLogin !== false;

		const updateLoginChangeUi = () => {
			changeLoginBtn.disabled = !canChangeLogin;
			if (!canChangeLogin && profile.nextLoginChangeAt) {
				const when = this.#utils.formatListTime(new Date(profile.nextLoginChangeAt));
				loginCooldownHint.textContent = this.#i18n.t('loginChangeAvailableAt', when);
				loginCooldownHint.hidden = false;
			} else {
				loginCooldownHint.hidden = true;
			}
		};
		updateLoginChangeUi();

		const applyLoginChanged = (newLogin, meta = {}) => {
			const trimmed = (newLogin || '').trim();
			if (!trimmed) return;
			profile.login = trimmed;
			user.login = trimmed;
			if (meta.canChangeLogin !== undefined) canChangeLogin = !!meta.canChangeLogin;
			if (meta.lastLoginChangedAt !== undefined) profile.lastLoginChangedAt = meta.lastLoginChangedAt;
			if (meta.nextLoginChangeAt !== undefined) profile.nextLoginChangeAt = meta.nextLoginChangeAt;
			loginDisplay.textContent = '@' + trimmed;
			headLogin.textContent = '@' + trimmed;
			profileQrLink = buildUserProfileUrl(trimmed);
			if (headerQrBtn) {
				headerQrBtn.remove();
				headerQrBtn = null;
			}
			updateLoginChangeUi();
			callbacks.onUserUpdated?.({
				...user,
				login: trimmed,
				name: user.name || profile.displayName,
				statusText: profile.statusText ?? user.statusText ?? '',
			});
		};

		const openChangeLoginModal = () => {
			if (!canChangeLogin) {
				showStatus(accountMsg, this.#i18n.t('loginChangeOncePerDay'), false);
				return;
			}
			const currentLogin = profile.login || user.login || '';
			lockAppScroll();
			const overlay = document.createElement('div');
			overlay.className = 'mapp-modal-overlay';
			const closeModal = messengerMakeDismissable(() => {
				unlockAppScroll();
				overlay.remove();
			}, null);
			const modal = document.createElement('div');
			modal.className = 'mapp-modal mapp-change-login-modal';
			this.#themeManager.applyChatVars(modal);
			this.#themeManager.applyAppVars(modal);

			const header = document.createElement('div');
			header.className = 'mapp-modal-header';
			const title = document.createElement('div');
			title.className = 'mapp-modal-title';
			title.textContent = this.#i18n.t('changeLoginTitle');
			const closeBtn = document.createElement('button');
			closeBtn.type = 'button';
			closeBtn.className = 'mapp-modal-close';
			closeBtn.innerHTML = '×';
			closeBtn.addEventListener('click', () => closeModal());
			header.append(title, closeBtn);

			const body = document.createElement('div');
			body.className = 'mapp-modal-body mapp-change-login-modal-body';
			const loginInput = document.createElement('input');
			loginInput.type = 'text';
			loginInput.className = 'mapp-profile-field-input';
			loginInput.value = currentLogin;
			loginInput.autocomplete = 'username';
			loginInput.spellcheck = false;
			loginInput.placeholder = this.#i18n.t('loginLabel');
			const loginChangeHint = document.createElement('div');
			loginChangeHint.className = 'mapp-input-hint';
			loginChangeHint.textContent = this.#i18n.t('loginChangeHint');
			const modalMsg = mkStatusMsg();
			modalMsg.hidden = true;
			body.append(loginInput, loginChangeHint, modalMsg);

			const footer = document.createElement('div');
			footer.className = 'mapp-modal-footer';
			const cancelBtn = document.createElement('button');
			cancelBtn.type = 'button';
			cancelBtn.className = 'mapp-btn mapp-btn-secondary mapp-modal-footer-btn';
			cancelBtn.textContent = this.#i18n.t('cancel');
			cancelBtn.addEventListener('click', () => closeModal());
			const submitBtn = document.createElement('button');
			submitBtn.type = 'button';
			submitBtn.className = 'mapp-btn mapp-btn-primary mapp-modal-footer-btn';
			submitBtn.textContent = this.#i18n.t('changeLoginSubmit');
			submitBtn.addEventListener('click', async () => {
				const nextLogin = loginInput.value.trim();
				if (!nextLogin) {
					showStatus(modalMsg, this.#i18n.t('loginLabel'), false);
					return;
				}
				if (nextLogin === currentLogin) {
					closeModal();
					return;
				}
				closeModal();
				const confirmed = await MessengerDialog.confirm({
					title: this.#i18n.t('changeLoginConfirmTitle'),
					message: this.#i18n.t('changeLoginConfirmMessage', currentLogin, nextLogin),
					type: MessengerDialog.TYPE_WARNING,
					confirmLabel: this.#i18n.t('changeLoginSubmit'),
					cancelLabel: this.#i18n.t('cancel'),
					themeManager: this.#themeManager,
				});
				if (!confirmed) return;
				const r = await fetch('/api/profile/change-login', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					credentials: 'same-origin',
					body: JSON.stringify({ login: nextLogin }),
				});
				const j = await r.json().catch(() => ({}));
				if (!r.ok) {
					showStatus(accountMsg, j.error || 'Error', false);
					return;
				}
				applyLoginChanged(j.login || nextLogin, j);
				showStatus(accountMsg, this.#i18n.t('saved'), true);
			});
			footer.append(cancelBtn, submitBtn);
			modal.append(header, body, footer);
			overlay.appendChild(modal);
			overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });
			document.body.appendChild(overlay);
			loginInput.focus();
			loginInput.select();
		};

		changeLoginBtn.addEventListener('click', () => openChangeLoginModal());

		const displayNameField = mkProfileField(this.#i18n.t('displayNameLabel'), displayNameInput);
		accountCard.append(
			mkProfileField(this.#i18n.t('loginLabel'), loginChangeWrap),
			displayNameField,
			mkProfileField(this.#i18n.t('aboutMeLabel'), aboutInput),
			mkProfileField(this.#i18n.t('emailLabel'), emailInput),
			mkProfileField(this.#i18n.t('phoneLabel'), phoneInput),
		);
		accountForm.appendChild(accountCard);
		accountForm.appendChild(accountMsg);
		const validateDisplayName = () => {
			if (!displayNameInput.value.trim()) {
				setProfileFieldValidation(displayNameField, 'err', this.#i18n.t('displayNameRequired'));
				return false;
			}
			setProfileFieldValidation(displayNameField, null, null);
			return true;
		};
		displayNameInput.addEventListener('blur', () => {
			validateDisplayName();
			scheduleProfileAutosave(accountMsg);
		});
		aboutInput.addEventListener('blur', () => scheduleProfileAutosave(accountMsg));
		emailInput.addEventListener('blur', () => scheduleProfileAutosave(accountMsg));
		phoneInput.addEventListener('blur', () => scheduleProfileAutosave(accountMsg));
		displayNameInput.addEventListener('input', () => {
			headName.textContent = displayNameInput.value.trim() || profile.displayName || user.name || '';
		});

		const logoutBtn = document.createElement('button');
		logoutBtn.type = 'button';
		logoutBtn.className = 'mapp-btn mapp-btn-logout mapp-btn-block mapp-btn-settings-wide';
		logoutBtn.textContent = this.#i18n.t('logout');
		logoutBtn.addEventListener('click', async () => {
			if (typeof callbacks.onLogout === 'function') await callbacks.onLogout();
		});
		accountForm.appendChild(logoutBtn);
		accountScroll.appendChild(accountForm);
		accountView.appendChild(accountScroll);

		const chatSettingsScroll = document.createElement('div');
		chatSettingsScroll.className = 'mapp-profile-tab-scroll mapp-profile-form-page';
		chatSettingsScroll.appendChild(buildThemeAppearancePanel({
			themeManager: this.#themeManager,
			i18n: this.#i18n,
		}));
		const chatPrefsCard = mkUiCard(this.#i18n.t('chatSettingsTab'));
		const { row: sendOnEnterRow, input: sendOnEnterChk } = mkToggleField(
			this.#i18n.t('sendOnEnter'),
			{ checked: MessengerChatPreferences.getSendOnEnter() },
		);
		const sendOnEnterHint = document.createElement('div');
		sendOnEnterHint.className = 'mapp-input-hint mapp-settings-hint--send-enter';
		sendOnEnterHint.textContent = this.#i18n.t('sendOnEnterHint');
		const updateSendOnEnterHint = () => {
			const show = !MessengerChatPreferences.isMobileViewport() && sendOnEnterChk.checked;
			sendOnEnterHint.hidden = !show;
		};
		sendOnEnterChk.addEventListener('change', () => {
			MessengerChatPreferences.setSendOnEnter(
				MessengerChatPreferences.isMobileViewport(),
				sendOnEnterChk.checked
			);
			updateSendOnEnterHint();
		});
		window.addEventListener('resize', () => {
			sendOnEnterChk.checked = MessengerChatPreferences.getSendOnEnter();
			updateSendOnEnterHint();
		});
		updateSendOnEnterHint();
		chatPrefsCard.append(sendOnEnterRow, sendOnEnterHint);
		chatSettingsScroll.appendChild(chatPrefsCard);
		chatSettingsPanel.appendChild(chatSettingsScroll);

		if (callbacks.api) {
			const foldersScroll = document.createElement('div');
			foldersScroll.className = 'mapp-profile-tab-scroll mapp-profile-form-page';
			foldersScroll.appendChild(buildFolderSettingsPanel({
				utils: this.#utils,
				icons: this.#icons,
				i18n: this.#i18n,
				api: callbacks.api,
				themeManager: this.#themeManager,
				onChanged: () => callbacks.onFoldersChanged?.(),
				onOpenArchive: () => callbacks.onOpenArchive?.(),
				onCreateFolder: () => callbacks.onCreateFolder?.(),
			}));
			foldersPanel.appendChild(foldersScroll);
		}

		aboutPanel.appendChild(buildAboutSettingsPanel({
			branding,
			i18n: this.#i18n,
			themeManager: this.#themeManager,
		}));
		helpPanel.appendChild(buildAppHtmlSettingsPanel(
			branding.helpHtml,
			this.#i18n.t('contentEmpty'),
			this.#i18n.t('helpTab'),
		));

		viewsEl.append(homeView, accountView, chatSettingsPanel, foldersPanel, aboutPanel, helpPanel);

		const pwdScroll = document.createElement('div');
		pwdScroll.className = 'mapp-profile-tab-scroll mapp-profile-form-page';

		const mkSectionTitle = (text) => {
			const h = document.createElement('div');
			h.className = 'mapp-section-label mapp-section-label--spaced';
			h.textContent = text;
			return h;
		};

		const pwdMsg = mkStatusMsg();

		const loginForm = document.createElement('form');
		loginForm.className = 'mapp-profile-account-form';
		const loginCard = mkUiCard(this.#i18n.t('passwordSectionLogin'));
		const curPwdField = MessengerDialog.createPasswordField({
			minLength: 6,
			placeholder: this.#i18n.t('currentPassword'),
		});
		applyProfilePasswordFieldStyle(curPwdField);
		loginCard.append(
			mkProfileField(this.#i18n.t('currentPassword'), curPwdField.wrap),
		);
		const newPwdField = MessengerDialog.createPasswordField({
			minLength: 6,
			placeholder: this.#i18n.t('newPassword'),
		});
		applyProfilePasswordFieldStyle(newPwdField);
		loginCard.append(
			mkProfileField(this.#i18n.t('newPassword'), newPwdField.wrap),
		);
		const loginPwdBtn = document.createElement('button');
		loginPwdBtn.type = 'submit';
		loginPwdBtn.className = 'mapp-btn mapp-btn-primary mapp-btn-block mapp-btn-settings-wide';
		loginPwdBtn.textContent = this.#i18n.t('changePassword');
		loginCard.appendChild(loginPwdBtn);
		loginForm.appendChild(loginCard);

		const encConfigured = !!profile.encryptionConfigured;
		const userId = profile.id || user.id;
		let masterPasswordMatchesLogin = profile.masterPasswordMatchesLogin !== false;

		loginForm.addEventListener('submit', async (e) => {
			e.preventDefault();
			const curLogin = curPwdField.input.value;
			const newLogin = newPwdField.input.value;
			const r = await fetch('/api/profile/change-password', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'same-origin',
				body: JSON.stringify({
					currentPassword: curLogin,
					newPassword: newLogin,
				}),
			});
			const j = await r.json().catch(() => ({}));
			if (!r.ok) {
				showStatus(pwdMsg, j.error || 'Error', false);
				return;
			}
			if (masterPasswordMatchesLogin && profile.encryptionConfigured) {
				try {
					const changed = await SupraCrypto.changeMasterPassword(
						curLogin,
						newLogin,
						userId,
						profile.encryptionSalt,
						profile.encryptionVerifier
					);
					await SupraAuthCrypto.updateMasterVerifier(
						changed.salt,
						changed.verifier,
						changed.privateKeyBlob
					);
					profile.encryptionSalt = changed.salt;
					profile.encryptionVerifier = changed.verifier;
					await SupraAuthCrypto.saveSession(userId, changed.salt, changed.verifier, newLogin);
					if (window.supraCrypto) {
						await window.supraCrypto.initSession(
							newLogin, userId, changed.salt, changed.verifier);
					}
				} catch (ex) {
					showStatus(pwdMsg, ex.message || 'Error', false);
					return;
				}
			}
			curPwdField.input.value = '';
			newPwdField.input.value = '';
			showStatus(pwdMsg, this.#i18n.t('saved'), true);
		});

		const masterForm = document.createElement('form');
		masterForm.className = 'mapp-master-password-form';
		const masterCard = mkUiCard(this.#i18n.t('passwordSectionMaster'));

		const { row: masterSameRow, input: masterSameCb } = mkToggleField(
			this.#i18n.t('masterSameAsLogin'),
			{ checked: masterPasswordMatchesLogin },
		);
		masterSameRow.classList.add('mapp-toggle-row--flush-next');
		masterCard.appendChild(masterSameRow);

		const masterHint = document.createElement('div');
		masterHint.className = 'mapp-master-password-hint';
		masterCard.appendChild(masterHint);

		const masterMin = SupraAuthCrypto.MASTER_MIN_LENGTH;
		const curMasterWrap = document.createElement('div');
		const curMasterField = MessengerDialog.createPasswordField({ minLength: masterMin });
		applyProfilePasswordFieldStyle(curMasterField);
		curMasterWrap.appendChild(mkProfileField(this.#i18n.t('currentMasterPassword'), curMasterField.wrap));

		const newMasterWrap = document.createElement('div');
		const newMasterField = MessengerDialog.createPasswordField({ minLength: masterMin });
		applyProfilePasswordFieldStyle(newMasterField);
		newMasterWrap.appendChild(mkProfileField(this.#i18n.t('newMasterPassword'), newMasterField.wrap));

		const masterBtn = document.createElement('button');
		masterBtn.type = 'submit';
		masterBtn.className = 'mapp-btn mapp-btn-primary mapp-btn-block mapp-btn-settings-wide';
		masterBtn.textContent = encConfigured
			? this.#i18n.t('changeMasterPassword')
			: this.#i18n.t('setupMasterPassword');
		masterCard.append(curMasterWrap, newMasterWrap, masterBtn);
		masterForm.appendChild(masterCard);

		const updateMasterFormUi = () => {
			const same = masterSameCb.checked;
			masterHint.textContent = same
				? this.#i18n.t('masterSameAsLoginHint')
				: this.#i18n.t('masterPasswordHint');
			masterHint.hidden = false;
			curMasterWrap.hidden = same || !encConfigured;
			newMasterWrap.hidden = same;
			masterBtn.hidden = same && encConfigured;
			masterHint.classList.toggle('mapp-master-password-hint--with-fields', !same && encConfigured);
		};
		updateMasterFormUi();

		masterForm.addEventListener('submit', async (e) => {
			e.preventDefault();
			if (masterSameCb.checked) {
				showStatus(pwdMsg, this.#i18n.t('masterSameAsLoginHint'), true);
				return;
			}
			try {
				const newMaster = newMasterField.input.value;
				const lenErr = MessengerDialog.validatePasswordLength(
					newMaster, masterMin, 'Мастер-пароль');
				if (lenErr) {
					showStatus(pwdMsg, lenErr, false);
					return;
				}
				if (encConfigured) {
					const oldMaster = masterPasswordMatchesLogin
						? curPwdField.input.value
						: curMasterField.input.value;
					if (!oldMaster) {
						showStatus(
							pwdMsg,
							masterPasswordMatchesLogin
								? this.#i18n.t('enterLoginPasswordToMerge')
								: this.#i18n.t('currentMasterPassword'),
							false
						);
						return;
					}
					const changed = await SupraCrypto.changeMasterPassword(
						oldMaster,
						newMaster,
						userId,
						profile.encryptionSalt,
						profile.encryptionVerifier
					);
					await SupraAuthCrypto.updateMasterVerifier(
						changed.salt,
						changed.verifier,
						changed.privateKeyBlob
					);
					await SupraAuthCrypto.saveSession(userId, changed.salt, changed.verifier, newMaster);
					if (window.supraCrypto) {
						await window.supraCrypto.initSession(
							newMaster, userId, changed.salt, changed.verifier);
					}
				} else {
					const setup = await SupraAuthCrypto.setupEncryption(newMaster, userId);
					await SupraAuthCrypto.saveSession(userId, setup.salt, setup.verifier, newMaster);
					profile.encryptionConfigured = true;
					profile.encryptionSalt = setup.salt;
					profile.encryptionVerifier = setup.verifier;
					curMasterWrap.hidden = false;
					masterBtn.textContent = this.#i18n.t('changeMasterPassword');
				}
				await SupraAuthCrypto.setMasterPasswordMatchesLogin(false);
				masterPasswordMatchesLogin = false;
				masterSameCb.checked = false;
				updateMasterFormUi();
				masterForm.reset();
				showStatus(pwdMsg, this.#i18n.t('saved'), true);
			} catch (ex) {
				showStatus(pwdMsg, ex.message || 'Error', false);
			}
		});

		masterSameCb.addEventListener('change', async () => {
			updateMasterFormUi();
			if (!masterSameCb.checked) {
				return;
			}
			const loginPwd = curPwdField.input.value;
			if (!loginPwd || loginPwd.length < 6) {
				masterSameCb.checked = false;
				updateMasterFormUi();
				showStatus(pwdMsg, this.#i18n.t('enterLoginPasswordToMerge'), false);
				return;
			}
			try {
				if (encConfigured) {
					const ok = await SupraCrypto.verifyMasterPassword(
						loginPwd,
						userId,
						profile.encryptionSalt,
						profile.encryptionVerifier
					);
					if (!ok && curMasterField.input.value) {
						const changed = await SupraCrypto.changeMasterPassword(
							curMasterField.input.value,
							loginPwd,
							userId,
							profile.encryptionSalt,
							profile.encryptionVerifier
						);
						await SupraAuthCrypto.updateMasterVerifier(
							changed.salt,
							changed.verifier,
							changed.privateKeyBlob
						);
						profile.encryptionSalt = changed.salt;
						profile.encryptionVerifier = changed.verifier;
						await SupraAuthCrypto.saveSession(userId, changed.salt, changed.verifier, loginPwd);
						if (window.supraCrypto) {
							await window.supraCrypto.initSession(
								loginPwd, userId, changed.salt, changed.verifier);
						}
					} else if (!ok) {
						masterSameCb.checked = false;
						updateMasterFormUi();
						showStatus(
							pwdMsg,
							'Сначала введите текущий мастер-пароль или сбросьте шифрование',
							false
						);
						return;
					} else {
						await SupraAuthCrypto.saveSession(
							userId,
							profile.encryptionSalt,
							profile.encryptionVerifier,
							loginPwd
						);
					}
				} else {
					const setup = await SupraAuthCrypto.setupEncryption(loginPwd, userId);
					await SupraAuthCrypto.saveSession(userId, setup.salt, setup.verifier, loginPwd);
					profile.encryptionConfigured = true;
					profile.encryptionSalt = setup.salt;
					profile.encryptionVerifier = setup.verifier;
					curMasterWrap.hidden = false;
					masterBtn.textContent = this.#i18n.t('changeMasterPassword');
					if (window.supraCrypto) {
						await window.supraCrypto.initSession(
							loginPwd, userId, setup.salt, setup.verifier);
					}
				}
				await SupraAuthCrypto.setMasterPasswordMatchesLogin(true);
				masterPasswordMatchesLogin = true;
				SupraAuthCrypto.clearMasterMismatchFlag();
				updateMasterFormUi();
				showStatus(pwdMsg, this.#i18n.t('saved'), true);
			} catch (ex) {
				masterSameCb.checked = false;
				updateMasterFormUi();
				showStatus(pwdMsg, ex.message || 'Error', false);
			}
		});

		pwdScroll.append(loginForm, masterForm, pwdMsg);
		pwdPanel.appendChild(pwdScroll);
		viewsEl.appendChild(pwdPanel);

		let panelEl = null;
		let settingsMenuEl = null;
		const settingsItems = buildMessengerAppSettingsMenuItems({
			themeManager: this.#themeManager,
			icons: this.#icons,
			i18n: this.#i18n,
			targetRootEl,
			getPanelEl: () => panelEl,
			getMenuEl: () => settingsMenuEl,
			onClearCache: () => this.#onClearCache(),
			onClearAll: () => this.#onClearAll(),
			includeTheme: false,
		});

		if (user.userType === 'Admin') {
			settingsItems.push({
				id: 'admin',
				labelKey: 'adminPanel',
				icon: this.#icons.admin(),
				action: () => {
					window.open('/admin.html', '_blank', 'noopener,noreferrer');
				},
			});
		}

		settingsMenuEl = this.#menuBuilder.buildMenu(settingsItems, targetRootEl);
		settingsMenuEl.classList.add('mapp-settings-action-menu');
		const settingsScroll = document.createElement('div');
		settingsScroll.className = 'mapp-profile-tab-scroll mapp-profile-form-page';
		const settingsCard = mkUiCard(this.#i18n.t('appSettings'));
		settingsCard.appendChild(settingsMenuEl);
		settingsScroll.appendChild(settingsCard);
		settingsPanel.appendChild(settingsScroll);
		viewsEl.appendChild(settingsPanel);

		wrap.appendChild(viewsEl);

		panelEl = this.#menuBuilder.buildWindow(
			this.#i18n.t('settings'),
			wrap,
			() => this.close(),
		);
		panelEl.classList.add('mc-panel-window--profile');

		const headerEl = panelEl.querySelector('.mc-panel-window-header');
		let titleRowEl = headerEl?.querySelector('.mc-panel-window-title-row');
		let titleEl = headerEl?.querySelector('.mc-panel-window-title');
		if (!titleRowEl && headerEl && titleEl) {
			titleRowEl = document.createElement('div');
			titleRowEl.className = 'mc-panel-window-title-row';
			titleEl.replaceWith(titleRowEl);
			titleRowEl.appendChild(titleEl);
		}
		let profileQrLink = buildUserProfileUrl(profile.login || user.login);
		let headerQrBtn = null;
		let headerBackBtn = null;

		const ensureHeaderBackBtn = () => {
			if (headerBackBtn) return headerBackBtn;
			headerBackBtn = document.createElement('button');
			headerBackBtn.type = 'button';
			headerBackBtn.className = 'mapp-settings-header-back';
			headerBackBtn.innerHTML = this.#icons.back();
			headerBackBtn.title = this.#i18n.t('back');
			headerBackBtn.setAttribute('aria-label', this.#i18n.t('back'));
			headerBackBtn.addEventListener('click', () => {
				if (currentView === 'home') this.close(true);
				else history.back();
			});
			return headerBackBtn;
		};

		const updateChrome = () => {
			if (!titleRowEl || !titleEl) return;
			if (currentView === 'home') {
				headerBackBtn?.remove();
				headerBackBtn = null;
				if (!headerQrBtn) {
					headerQrBtn = createProfileQrButton({
						link: profileQrLink,
						qrTitle: this.#i18n.t('qrProfileTitle'),
						icons: this.#icons,
						i18n: this.#i18n,
						themeManager: this.#themeManager,
					});
					titleRowEl.insertBefore(headerQrBtn, titleEl);
				}
				titleEl.textContent = this.#i18n.t('settings');
			} else {
				headerQrBtn?.remove();
				headerQrBtn = null;
				const back = ensureHeaderBackBtn();
				if (!back.parentElement) titleRowEl.insertBefore(back, titleRowEl.firstChild);
				titleEl.textContent = viewTitles[currentView] || '';
			}
		};

		const showViewWithChrome = (viewId) => {
			showView(viewId);
			updateChrome();
		};

		const navigateTo = (viewId) => {
			if (viewId === currentView) return;
			history.pushState({ mappSettings: true, view: viewId }, '');
			this.#navDepth++;
			showViewWithChrome(viewId);
		};

		navList.addEventListener('click', (e) => {
			const row = e.target.closest('.mapp-settings-nav-item');
			if (!row?.dataset.view) return;
			navigateTo(row.dataset.view);
		});

		this.#popHandler = (e) => {
			if (this.#closing) return;
			// Оверлеи (диалоги/просмотр фото и т.п.) закрывает глобальный слушатель.
			if (messengerPopstateWasConsumed()) return;
			messengerConsumePopstate();
			if (e.state?.mappSettings) {
				const targetView = e.state.view || 'home';
				if (currentView === 'home' && targetView === 'home') {
					this.close(false);
					return;
				}
				this.#navDepth = Math.max(0, this.#navDepth - 1);
				showViewWithChrome(targetView);
				return;
			}
			this.#navDepth = 0;
			if (this.#popHandler) {
				window.removeEventListener('popstate', this.#popHandler);
				this.#popHandler = null;
			}
			if (this.#closeOverlay) {
				this.#closing = true;
				this.#closeOverlay();
				this.#closeOverlay = null;
				unlockAppScroll();
				this.#closing = false;
			}
		};
		window.addEventListener('popstate', this.#popHandler);
		history.pushState({ mappSettings: true, view: 'home' }, '');
		this.#navDepth = 1;
		updateChrome();

		this.#themeManager.applyChatVars(panelEl);
		this.#themeManager.applyAppVars(panelEl);
		this.#themeManager.applyChatVars(wrap);
		this.#themeManager.applyChatVars(viewsEl);
		const bodyEl = panelEl.querySelector('.mc-panel-window-body');
		if (bodyEl) {
			this.#themeManager.applyChatVars(bodyEl);
			this.#themeManager.applyAppVars(bodyEl);
		}

		this.#closeOverlay = this.#menuBuilder.openInOverlay(panelEl);
		const overlayEl = panelEl.parentElement;
		if (overlayEl) {
			this.#themeManager.applyChatVars(overlayEl);
			this.#themeManager.applyAppVars(overlayEl);
		}
	}

	close() {
		if (this.#closing) return;
		this.#closing = true;
		if (this.#popHandler) {
			window.removeEventListener('popstate', this.#popHandler);
			this.#popHandler = null;
		}
		const depth = this.#navDepth;
		this.#navDepth = 0;
		if (this.#closeOverlay) {
			this.#closeOverlay();
			this.#closeOverlay = null;
		}
		unlockAppScroll();
		if (depth > 0) {
			history.go(-depth);
		}
		this.#closing = false;
	}
}

class MessengerGroupProfileModal {
	#utils;
	#icons;
	#i18n;
	#themeManager;
	#dismiss = null;
	#menuBuilder;
	#avatarBuilder;
	#api;
	#closeOverlay = null;

	constructor(utils, icons, i18n, themeManager, menuBuilder, avatarBuilder, api) {
		this.#utils = utils;
		this.#icons = icons;
		this.#i18n = i18n;
		this.#themeManager = themeManager;
		this.#menuBuilder = menuBuilder;
		this.#avatarBuilder = avatarBuilder;
		this.#api = api;
	}

	async open(targetRootEl, chat, callbacks = {}) {
		this.close();
		let me = null;
		try {
			me = await this.#api.getCurrentUser();
		} catch { /* ignore */ }
		let info;
		try {
			info = await this.#api.getGroupInfo(chat.id);
			if (!info?.success) throw new Error(info?.error || 'GetGroupInfo failed');
		} catch (e) {
			MessengerDialog.alert({
				title: this.#i18n.t('groupSaveError'),
				message: e.message || '',
				type: MessengerDialog.TYPE_DANGER,
				themeManager: this.#themeManager,
			});
			return;
		}

		const canEdit = !!info.canEdit;
		if (canEdit) {
			this.#api.distributeMissingGroupKeys(chat.id).catch(() => {});
		}
		const content = this.#utils.mk('div', 'mapp-group-profile-content');
		const statusEl = this.#utils.mk('div', 'mapp-profile-status-text');
		statusEl.hidden = true;

		const head = this.#utils.mk('div', 'mapp-profile-head');
		const avatarSlot = this.#utils.mk('div', 'mapp-profile-head-avatar');
		const avatarUrl = info.avatar || chat.avatar || null;
		avatarSlot.appendChild(
			this.#avatarBuilder.build(chat.id, info.name || chat.name, avatarUrl, 56)
		);
		let pendingPhoto = null;
		let groupAvatarPreviewUrl = null;
		if (canEdit) {
			const getGroupAvatarSrc = () => {
				if (groupAvatarPreviewUrl) return groupAvatarPreviewUrl;
				return info.avatar || chat.avatar || null;
			};
			const hasGroupPhoto = () => !!getGroupAvatarSrc();
			const applyGroupPhoto = async (file) => {
				if (!file) return;
				pendingPhoto = await compressImageFile(file, 512);
				if (groupAvatarPreviewUrl) URL.revokeObjectURL(groupAvatarPreviewUrl);
				groupAvatarPreviewUrl = URL.createObjectURL(pendingPhoto);
				avatarSlot.innerHTML = '';
				avatarSlot.appendChild(
					this.#avatarBuilder.build(chat.id, info.name || chat.name, groupAvatarPreviewUrl, 56)
				);
				await persistGroupSettings({ photo: pendingPhoto });
			};
			const pickGroupAvatar = () => openAvatarSourcePicker({
				i18n: this.#i18n,
				themeManager: this.#themeManager,
				icons: this.#icons,
				cropOutputSize: 512,
				onPick: applyGroupPhoto,
			});
			avatarSlot.classList.add('mapp-profile-head-avatar--editable');
			avatarSlot.title = this.#i18n.t('changeGroupAvatar');
			avatarSlot.addEventListener('click', () => {
				if (hasGroupPhoto()) {
					openProfileAvatarFullscreen(getGroupAvatarSrc(), {
						i18n: this.#i18n,
						themeManager: this.#themeManager,
						icons: this.#icons,
						onEdit: pickGroupAvatar,
					});
				} else {
					pickGroupAvatar();
				}
			});
		} else if (avatarUrl) {
			avatarSlot.classList.add('mapp-profile-head-avatar--zoom');
			avatarSlot.addEventListener('click', () =>
				MessengerImageViewer.open(avatarUrl, this.#icons));
		}

		const headText = this.#utils.mk('div', 'mapp-profile-head-text');
		const nameInput = document.createElement('input');
		nameInput.type = 'text';
		applyStandardFieldInput(nameInput);
		nameInput.value = info.name || chat.name || '';
		nameInput.disabled = !canEdit;
		const nameField = mkProfileField(this.#i18n.t('groupNameLabel'), nameInput);
		headText.appendChild(nameField);
		head.append(avatarSlot, headText);
		content.appendChild(head);

		let savedRequiresExtra = !!info.requiresCustomGroupPassword;
		const encCard = mkUiCard(this.#i18n.t('passwordSectionMaster'));
		const encHint = this.#utils.mk('div', 'mapp-input-hint mapp-group-section-hint');
		encHint.textContent = this.#i18n.t('groupExtraPasswordToggleHint');
		encCard.appendChild(encHint);

		let extraModeChk = null;
		if (canEdit) {
			const extraToggle = mkToggleField(
				this.#i18n.t('groupExtraPasswordToggle'),
				{ checked: savedRequiresExtra },
			);
			extraModeChk = extraToggle.input;
			encCard.appendChild(extraToggle.row);
			extraModeChk.addEventListener('change', () => {
				savedRequiresExtra = extraModeChk.checked;
				persistGroupSettings({ requiresCustomGroupPassword: savedRequiresExtra });
			});
		}

		const setPwdBtn = this.#utils.mk('button', 'mapp-btn mapp-btn-secondary mapp-btn-block mapp-btn-settings-wide mapp-group-set-pwd-btn');
		setPwdBtn.type = 'button';
		setPwdBtn.textContent = this.#i18n.t('chatEncryptionSetPassword');
		setPwdBtn.addEventListener('click', async () => {
			const crypto = this.#api.getCrypto?.() || window.supraCrypto;
			if (!crypto) {
				await MessengerDialog.alert({
					title: this.#i18n.t('masterPasswordLock'),
					message: this.#i18n.t('masterPasswordLock'),
					themeManager: this.#themeManager,
				});
				return;
			}
			const pwd = await MessengerDialog.promptPassword({
				title: this.#i18n.t('chatEncryptionSetPassword'),
				message: this.#i18n.t('groupCustomPasswordHint'),
				placeholder: this.#i18n.t('groupCustomPasswordPlaceholder'),
				minLength: SupraAuthCrypto.GROUP_EXTRA_MIN_LENGTH,
				confirmLabel: this.#i18n.t('ok'),
				cancelLabel: this.#i18n.t('cancel'),
				themeManager: this.#themeManager,
			});
			if (!pwd) return;
			await crypto.setCustomPassword(chat.id, pwd);
			crypto.invalidateChatKey(chat.id);
			await MessengerDialog.alert({
				title: this.#i18n.t('chatEncryptionSetPassword'),
				message: this.#i18n.t('chatEncryptionStatusOn'),
				confirmLabel: this.#i18n.t('ok'),
				themeManager: this.#themeManager,
			});
		});
		encCard.appendChild(setPwdBtn);
		content.appendChild(encCard);

		let savedName = (info.name || chat.name || '').trim();
		let savedAllowJoinByLink = !!info.allowJoinByLink;
		let allowJoinByLink = savedAllowJoinByLink;
		let saveTimer = null;
		let saving = false;
		let panelEl = null;

		const showSaveStatus = (text, ok) => {
			statusEl.hidden = false;
			MessengerUtils.setStatusTone(statusEl, ok);
			statusEl.textContent = text;
			if (ok) {
				clearTimeout(showSaveStatus._hideTimer);
				showSaveStatus._hideTimer = setTimeout(() => { statusEl.hidden = true; }, 2000);
			}
		};

		const updateHeaderQr = (enabled) => {
			if (!panelEl) return;
			const titleRow = panelEl.querySelector('.mc-panel-window-title-row');
			const existingQr = panelEl.querySelector('.mc-panel-window-qr-btn');
			if (enabled && !existingQr && titleRow) {
				const qrBtn = createProfileQrButton({
					link: buildGroupProfileUrl(chat.id),
					qrTitle: this.#i18n.t('qrGroupTitle'),
					icons: this.#icons,
					i18n: this.#i18n,
					themeManager: this.#themeManager,
				});
				titleRow.prepend(qrBtn);
			} else if (!enabled && existingQr) {
				existingQr.remove();
			}
		};

		const persistGroupSettings = async ({ name, allowJoinByLink: linkFlag, requiresCustomGroupPassword: extraFlag, photo } = {}) => {
			if (!canEdit || saving) return;
			const nextName = name != null ? String(name).trim() : savedName;
			const nextLink = linkFlag != null ? !!linkFlag : savedAllowJoinByLink;
			const nextExtra = extraFlag != null ? !!extraFlag : savedRequiresExtra;
			const nameChanged = nextName && nextName !== savedName;
			const linkChanged = nextLink !== savedAllowJoinByLink;
			const extraChanged = nextExtra !== savedRequiresExtra;
			if (!nameChanged && !linkChanged && !extraChanged && !photo) return;

			saving = true;
			try {
				if (nameChanged || linkChanged || extraChanged) {
					await this.#api.updateGroup(chat.id, {
						...(nameChanged ? { name: nextName } : {}),
						...(linkChanged ? { allowJoinByLink: nextLink } : {}),
						...(extraChanged ? { requiresCustomGroupPassword: nextExtra } : {}),
					});
					if (nameChanged) savedName = nextName;
					if (linkChanged) {
						savedAllowJoinByLink = nextLink;
						allowJoinByLink = nextLink;
						updateHeaderQr(nextLink);
					}
					if (extraChanged) {
						savedRequiresExtra = nextExtra;
						const meta = this.#api.chatMeta(chat.id);
						if (meta) meta.requiresCustomGroupPassword = nextExtra;
					}
				}
				if (photo) {
					await this.#api.uploadGroupAvatar(chat.id, photo);
					pendingPhoto = null;
					if (groupAvatarPreviewUrl) {
						URL.revokeObjectURL(groupAvatarPreviewUrl);
						groupAvatarPreviewUrl = null;
					}
				}
				const refreshed = await this.#api.getGroupInfo(chat.id);
				const nextAvatar = refreshed?.avatar ?? null;
				if (photo) {
					info.avatar = nextAvatar;
					avatarSlot.innerHTML = '';
					avatarSlot.appendChild(
						this.#avatarBuilder.build(chat.id, refreshed?.name || savedName, nextAvatar, 56)
					);
				}
				callbacks.onUpdated?.({
					id: chat.id,
					name: refreshed?.name || savedName,
					avatar: nextAvatar,
				});
				showSaveStatus(this.#i18n.t('groupSaved'), true);
			} catch (e) {
				showSaveStatus(e.message || this.#i18n.t('groupSaveError'), false);
			} finally {
				saving = false;
			}
		};

		const linkCard = mkUiCard(this.#i18n.t('groupInviteLink'));
		linkCard.hidden = !allowJoinByLink;
		const linkSection = this.#utils.mk('div', 'mapp-group-link-section mapp-group-link-section--in-card');

		const renderGroupLinkSection = () => {
			linkCard.hidden = !allowJoinByLink;
			if (!allowJoinByLink) return;
			const groupLink = buildGroupProfileUrl(chat.id);
			linkSection.innerHTML = '';
			const linkRow = this.#utils.mk('div', 'mapp-invite-row');
			const linkMeta = this.#utils.mk('div', 'mapp-invite-row-meta');
			const linkEl = this.#utils.mk('div', 'mapp-invite-link mapp-selectable-text');
			linkEl.textContent = groupLink;
			linkMeta.appendChild(linkEl);
			const linkActions = this.#utils.mk('div', 'mapp-invite-actions');
			const copyBtn = this.#utils.mk('button', 'mapp-invite-action-btn');
			copyBtn.type = 'button';
			copyBtn.title = this.#i18n.t('invitationsCopy');
			copyBtn.innerHTML = this.#icons.copy();
			copyBtn.addEventListener('click', async () => {
				try {
					await navigator.clipboard.writeText(groupLink);
					statusEl.hidden = false;
					MessengerUtils.setStatusTone(statusEl, true);
					statusEl.textContent = this.#i18n.t('invitationsCopied');
				} catch {
					statusEl.hidden = false;
					MessengerUtils.setStatusTone(statusEl, false);
					statusEl.textContent = 'Error';
				}
			});
			const qrBtn = this.#utils.mk('button', 'mapp-invite-action-btn');
			qrBtn.type = 'button';
			qrBtn.title = this.#i18n.t('invitationsQr');
			qrBtn.innerHTML = this.#icons.qrCode();
			qrBtn.addEventListener('click', () => {
				MessengerQrDialog.show({
					link: groupLink,
					title: this.#i18n.t('qrGroupTitle'),
					i18n: this.#i18n,
					themeManager: this.#themeManager,
				});
			});
			linkActions.append(copyBtn, qrBtn);
			linkRow.append(linkMeta, linkActions);
			linkSection.appendChild(linkRow);
		};

		if (canEdit) {
			const accessCard = mkUiCard(this.#i18n.t('groupJoinByLink'));
			const { row: joinLinkRow, input: joinLinkChk } = mkToggleField(
				this.#i18n.t('groupJoinByLink'),
				{
					checked: allowJoinByLink,
					sublabel: this.#i18n.t('groupJoinByLinkHint'),
				},
			);
			accessCard.appendChild(joinLinkRow);
			content.appendChild(accessCard);
			joinLinkChk.addEventListener('change', () => {
				allowJoinByLink = joinLinkChk.checked;
				renderGroupLinkSection();
				updateHeaderQr(allowJoinByLink);
				persistGroupSettings({ allowJoinByLink });
			});
			nameInput.addEventListener('input', () => {
				clearTimeout(saveTimer);
				saveTimer = setTimeout(() => {
					const name = nameInput.value.trim();
					if (name && name !== savedName) persistGroupSettings({ name });
				}, 600);
			});
			nameInput.addEventListener('blur', () => {
				clearTimeout(saveTimer);
				const name = nameInput.value.trim();
				if (name && name !== savedName) persistGroupSettings({ name });
			});
		}
		linkCard.appendChild(linkSection);
		content.appendChild(linkCard);
		renderGroupLinkSection();

		const membersCard = mkUiCard(this.#i18n.t('groupMembers'));
		const membersList = this.#utils.mk('div', 'mapp-group-members-list');
		membersCard.appendChild(membersList);
		content.appendChild(membersCard);

		const memberIds = new Set((info.members || []).map(m => m.id));

		const renderMembers = (members) => {
			membersList.innerHTML = '';
			(members || []).forEach(member => {
				const row = this.#utils.mk('div', 'mapp-group-member-row');
				row.appendChild(
					this.#avatarBuilder.build(member.id, member.name, member.avatar, 36)
				);
				const meta = this.#utils.mk('div', 'mapp-group-member-meta');
				const nameEl = this.#utils.mk('div', 'mapp-chat-item-name');
				nameEl.textContent = member.name || member.login;
				const loginEl = this.#utils.mk('div', 'mapp-chat-item-preview');
				loginEl.textContent = '@' + (member.login || '');
				const badges = this.#utils.mk('div', 'mapp-group-member-badges');
				if (member.isCreator) {
					const b = this.#utils.mk('span', 'mapp-group-member-badge');
					b.textContent = this.#i18n.t('groupCreator');
					badges.appendChild(b);
				} else if (member.isAdmin) {
					const b = this.#utils.mk('span', 'mapp-group-member-badge');
					b.textContent = this.#i18n.t('groupAdmin');
					badges.appendChild(b);
				}
				meta.append(nameEl, loginEl, badges);
				row.appendChild(meta);

				if (canEdit && !member.isCreator) {
					const actions = this.#utils.mk('div', 'mapp-group-member-actions');
					const adminBtn = this.#utils.mk('button', 'mapp-group-member-icon-btn');
					adminBtn.type = 'button';
					adminBtn.innerHTML = this.#icons.shieldBadge();
					adminBtn.title = member.isAdmin
						? this.#i18n.t('revokeAdmin')
						: this.#i18n.t('grantAdmin');
					if (member.isAdmin) adminBtn.classList.add('mapp-group-member-icon-btn--active');
					adminBtn.addEventListener('click', async () => {
						const nextAdmin = !member.isAdmin;
						const confirmKey = nextAdmin ? 'grantAdminConfirm' : 'revokeAdminConfirm';
						const ok = await MessengerDialog.confirm({
							title: nextAdmin ? this.#i18n.t('grantAdmin') : this.#i18n.t('revokeAdmin'),
							message: this.#i18n.t(confirmKey).replace('{name}', member.name || member.login),
							type: MessengerDialog.TYPE_INFO,
							confirmLabel: this.#i18n.t('confirm'),
							cancelLabel: this.#i18n.t('cancel'),
							themeManager: this.#themeManager,
						});
						if (!ok) return;
						try {
							await this.#api.setGroupMemberAdmin(
								chat.id, member.id, nextAdmin);
							const refreshed = await this.#api.getGroupInfo(chat.id);
							if (refreshed?.success) renderMembers(refreshed.members);
						} catch (e) {
							console.warn('[GroupProfile] setAdmin', e);
						}
					});
					const removeBtn = this.#utils.mk('button', 'mapp-group-member-icon-btn mapp-group-member-icon-btn--danger');
					removeBtn.type = 'button';
					removeBtn.innerHTML = this.#icons.close();
					removeBtn.title = this.#i18n.t('removeMember');
					removeBtn.addEventListener('click', async () => {
						const ok = await MessengerDialog.confirm({
							title: this.#i18n.t('removeMember'),
							message: member.name || member.login,
							type: MessengerDialog.TYPE_DANGER,
							confirmLabel: this.#i18n.t('confirm'),
							cancelLabel: this.#i18n.t('cancel'),
							themeManager: this.#themeManager,
						});
						if (!ok) return;
						try {
							await this.#api.removeGroupMember(chat.id, member.id);
							memberIds.delete(member.id);
							const refreshed = await this.#api.getGroupInfo(chat.id);
							if (refreshed?.success) renderMembers(refreshed.members);
						} catch (e) {
							console.warn('[GroupProfile] removeMember', e);
						}
					});
					actions.append(adminBtn, removeBtn);
					if (me && member.id !== me.id) {
						const blockBtn = this.#utils.mk('button', 'mapp-group-member-icon-btn mapp-group-member-icon-btn--danger');
						blockBtn.type = 'button';
						blockBtn.innerHTML = this.#icons.block();
						blockBtn.title = this.#i18n.t('blockUser');
						blockBtn.addEventListener('click', async () => {
							const ok = await MessengerDialog.confirm({
								title: this.#i18n.t('blockUserTitle'),
								message: this.#i18n.t('blockUserMsg'),
								type: MessengerDialog.TYPE_DANGER,
								confirmLabel: this.#i18n.t('confirm'),
								cancelLabel: this.#i18n.t('cancel'),
								themeManager: this.#themeManager,
							});
							if (!ok) return;
							try {
								await this.#api.blockUser(member.id);
								await callbacks.onUserBlocked?.(member.id);
								memberIds.delete(member.id);
								const refreshed = await this.#api.getGroupInfo(chat.id);
								if (refreshed?.success) renderMembers(refreshed.members);
							} catch (e) {
								console.warn('[GroupProfile] blockUser', e);
							}
						});
						actions.append(blockBtn);
					}
					row.appendChild(actions);
				}
				membersList.appendChild(row);
			});
		};
		renderMembers(info.members);

		if (canEdit) {
			const addCard = mkUiCard(this.#i18n.t('groupAddMembers'));
			const { wrap: addSearchWrap, input: addSearch } = buildContactSearchBar(
				this.#icons,
				this.#i18n.t('searchContacts'),
			);
			const addList = this.#utils.mk('div', 'mapp-group-add-list');
			addCard.append(addSearchWrap, addList);
			content.appendChild(addCard);

			let addTimer = null;
			const loadAddContacts = async () => {
				const q = addSearch.value.trim();
				if (q.length > 0 && q.length < MessengerSidebar.MIN_SEARCH_LEN) {
					addList.innerHTML = '';
					const hint = this.#utils.mk('div', 'mapp-list-empty');
					hint.textContent = this.#i18n.t('searchMinChars');
					addList.appendChild(hint);
					return;
				}
				try {
					const batch = await this.#api.getAllContacts(1, 50, q);
					addList.innerHTML = '';
					const available = (batch || []).filter(c => !memberIds.has(c.id));
					if (!available.length) {
						const empty = this.#utils.mk('div', 'mapp-list-empty');
						empty.textContent = q ? this.#i18n.t('noContacts') : this.#i18n.t('searchContactsHint');
						addList.appendChild(empty);
						return;
					}
					available.forEach(c => {
						const row = this.#utils.mk('div', 'mapp-group-add-row');
						row.appendChild(this.#avatarBuilder.build(c.id, c.name, c.avatar, 32));
						const lbl = this.#utils.mk('span');
						lbl.textContent = c.name;
						const btn = this.#utils.mk('button', 'mapp-group-member-action-btn');
						btn.type = 'button';
						btn.textContent = '+';
						btn.addEventListener('click', async () => {
							try {
								await this.#api.addGroupMembers(chat.id, [c.id]);
								memberIds.add(c.id);
								const refreshed = await this.#api.getGroupInfo(chat.id);
								if (refreshed?.success) renderMembers(refreshed.members);
								loadAddContacts();
							} catch (e) {
								console.warn('[GroupProfile] addMember', e);
							}
						});
						row.append(lbl, btn);
						addList.appendChild(row);
					});
				} catch (e) {
					console.warn('[GroupProfile] loadContacts', e);
				}
			};
			addSearch.addEventListener('input', () => {
				clearTimeout(addTimer);
				addTimer = setTimeout(loadAddContacts, 300);
			});
			loadAddContacts();
		}

		const scrollWrap = this.#utils.mk('div', 'mapp-group-profile-scroll');
		scrollWrap.appendChild(content);

		const panelContent = this.#utils.mk('div', 'mapp-profile-window-content');
		panelContent.appendChild(scrollWrap);
		if (canEdit) {
			const statusBar = this.#utils.mk('div', 'mapp-group-profile-status-bar');
			statusBar.appendChild(statusEl);
			panelContent.appendChild(statusBar);
		}

		const panel = this.#menuBuilder.buildWindow(
			this.#i18n.t('groupProfile'),
			panelContent,
			() => this.close(),
			allowJoinByLink ? {
				profileLink: buildGroupProfileUrl(chat.id),
				qrTitle: this.#i18n.t('qrGroupTitle'),
				icons: this.#icons,
				i18n: this.#i18n,
				themeManager: this.#themeManager,
			} : {}
		);
		panelEl = panel;
		panel.classList.add('mc-panel-window--profile', 'mc-panel-window--group-profile');
		this.#themeManager.applyChatVars(panel);
		this.#themeManager.applyAppVars(panel);
		this.#closeOverlay = this.#menuBuilder.openInOverlay(panel);
		lockAppScroll();
		this.#dismiss = messengerMakeDismissable(() => {
			if (this.#closeOverlay) {
				this.#closeOverlay();
				this.#closeOverlay = null;
			}
			unlockAppScroll();
			this.#dismiss = null;
		}, null);
	}

	close() {
		if (this.#dismiss) {
			this.#dismiss();
			return;
		}
		if (this.#closeOverlay) {
			this.#closeOverlay();
			this.#closeOverlay = null;
		}
		unlockAppScroll();
	}
}

class MessengerAttachMenu {
	#utils;
	#icons;
	#i18n;
	#types;
	#onSelect;

	constructor(utils, icons, i18n, types, onSelect) {
		this.#utils = utils;
		this.#icons = icons;
		this.#i18n = i18n;
		this.#types = types;
		this.#onSelect = onSelect;
	}

	build() {
		const wrap = this.#utils.mk('div', 'mc-attach-wrap');
		const btn = this.#utils.mk('button', 'mc-attach-btn');
		btn.type = 'button';
		btn.innerHTML = this.#icons.paperclip();

		btn.addEventListener('click', e => {
			e.stopPropagation();
			if (!this.#types.length) return;
			// Same as chat with fileTransferTypes: ['file'] — system picker (gallery + files on Android).
			const type = this.#types.includes('file') ? 'file' : this.#types[0];
			this.#onSelect(type);
		});

		wrap.append(btn);
		return wrap;
	}
}

class MessengerNewChatModal {
	#utils;
	#icons;
	#avatarBuilder;
	#api;
	#i18n;
	#themeManager;

	#contacts = [];
	#selectedContacts = new Set();
	#page = 1;
	#rowCount = 50;
	#hasMore = true;
	#isLoading = false;
	#query = '';
	#debounceTimer = null;

	constructor(utils, icons, avatarBuilder, api, i18n, themeManager) {
		this.#utils = utils;
		this.#icons = icons;
		this.#avatarBuilder = avatarBuilder;
		this.#api = api;
		this.#i18n = i18n;
		this.#themeManager = themeManager ?? null;
	}

	open(onChatCreated) {
		this.#contacts = [];
		this.#selectedContacts = new Set();
		this.#page = 1;
		this.#hasMore = true;
		this.#isLoading = false;
		this.#query = '';

		const overlay = this.#utils.mk('div', 'mapp-modal-overlay');
		applyMobileFullscreenOverlay(overlay);
		lockAppScroll();
		const close = messengerMakeDismissable(() => {
			unlockAppScroll();
			overlay.remove();
		}, null);
		if (!overlay.classList.contains('mapp-modal-overlay--fullscreen')) {
			overlay.addEventListener('click', e => {
				if (e.target === overlay) close();
			});
		}

		const modal = this.#utils.mk('div', 'mapp-modal');

		if (this.#themeManager) {
			this.#themeManager.applyChatVars(modal);
			this.#themeManager.applyAppVars(modal);
		}

		const modalHeader = this.#utils.mk('div', 'mapp-modal-header');
		const titleRow = this.#utils.mk('div', 'mapp-modal-title-row');
		if (overlay.classList.contains('mapp-modal-overlay--fullscreen')) {
			const backBtn = this.#utils.mk('button', 'mapp-settings-header-back');
			backBtn.type = 'button';
			backBtn.innerHTML = this.#icons.back();
			backBtn.title = this.#i18n.t('back');
			backBtn.setAttribute('aria-label', this.#i18n.t('back'));
			backBtn.addEventListener('click', () => close());
			titleRow.appendChild(backBtn);
		}
		const modalTitle = this.#utils.mk('div', 'mapp-modal-title');
		modalTitle.textContent = this.#i18n.t('newChat');
		titleRow.appendChild(modalTitle);
		const closeBtn = this.#utils.mk('button', 'mapp-modal-close');
		closeBtn.innerHTML = '×';
		closeBtn.addEventListener('click', () => close());
		modalHeader.append(titleRow, closeBtn);

		const tabs = this.#utils.mk('div', 'mapp-modal-tabs');
		const tabDirect = this.#utils.mk('button', 'mapp-modal-tab mapp-modal-tab--active');
		tabDirect.textContent = this.#i18n.t('directChat');
		const tabGroup = this.#utils.mk('button', 'mapp-modal-tab');
		tabGroup.textContent = this.#i18n.t('group');
		tabs.append(tabDirect, tabGroup);

		const groupNameWrap = this.#utils.mk('div', 'mapp-modal-group-name-wrap');
		groupNameWrap.hidden = true;
		const groupNameInput = document.createElement('input');
		groupNameInput.type = 'text';
		applyStandardFieldInput(groupNameInput);
		groupNameInput.placeholder = this.#i18n.t('groupName');
		groupNameWrap.appendChild(mkProfileField(this.#i18n.t('groupNameLabel'), groupNameInput));

		const { wrap: searchWrap, input: searchInput } = buildContactSearchBar(
			this.#icons,
			this.#i18n.t('searchContacts'),
		);
		searchWrap.classList.add('mapp-modal-search-wrap');

		const selectedList = null;

		const contactsList = this.#utils.mk('div', 'mapp-modal-contacts');
		const bottomLoader = this.#utils.mk('div', 'mapp-modal-bottom-loader');
		bottomLoader.hidden = true;
		bottomLoader.appendChild(this.#utils.mk('div', 'mc-loader-spinner'));

		const footer = this.#utils.mk('div', 'mapp-modal-footer');
		const createBtn = this.#utils.mk('button', 'mapp-btn mapp-btn-primary mapp-modal-footer-btn');
		createBtn.type = 'button';
		createBtn.textContent = this.#i18n.t('createChat');
		createBtn.disabled = true;
		footer.appendChild(createBtn);

		let currentMode = 'direct';
		let createInFlight = false;

		const checkGroupBtn = () => {
			if (currentMode === 'group')
				createBtn.disabled = this.#selectedContacts.size === 0 || !groupNameInput.value.trim();
		};

		const openDirectChat = async (contact) => {
			if (createInFlight || !contact?.id) return;
			createInFlight = true;
			try {
				const chat = await this.#api.createDirectChat(contact.id);
				close();
				onChatCreated(chat);
			} catch (e) {
				console.warn('[MessengerNewChatModal] createDirectChat', e);
				await MessengerDialog.alert({
					title: this.#i18n.t('error') || 'Ошибка',
					message: e.message || '',
					type: MessengerDialog.TYPE_DANGER,
					themeManager: this.#themeManager,
				});
			} finally {
				createInFlight = false;
			}
		};

		groupNameInput.addEventListener('input', checkGroupBtn);

		const switchTab = mode => {
			currentMode = mode;
			tabDirect.classList.toggle('mapp-modal-tab--active', mode === 'direct');
			tabGroup.classList.toggle('mapp-modal-tab--active', mode === 'group');
			groupNameWrap.hidden = mode !== 'group';
			footer.hidden = mode === 'direct';
			searchWrap.hidden = false;
			createBtn.textContent = mode === 'direct' ? this.#i18n.t('createChat') : this.#i18n.t('createGroup');
			this.#selectedContacts.clear();
			this.#contacts = [];
			this.#page = 1;
			this.#hasMore = true;
			this.#query = '';
			searchInput.value = '';
			searchInput.placeholder = mode === 'group'
				? this.#i18n.t('filterContactsHint')
				: this.#i18n.t('searchContacts');
			createBtn.disabled = true;
			this.#loadPage(contactsList, mode, false, selectedList, createBtn, checkGroupBtn, bottomLoader, openDirectChat);
		};

		tabDirect.addEventListener('click', () => switchTab('direct'));
		tabGroup.addEventListener('click', () => switchTab('group'));

		searchInput.addEventListener('input', () => {
			clearTimeout(this.#debounceTimer);
			this.#debounceTimer = setTimeout(() => {
				const q = searchInput.value.trim();
				if (currentMode !== 'group' && q.length > 0 && q.length < MessengerSidebar.MIN_SEARCH_LEN) {
					contactsList.innerHTML = '';
					const hint = this.#utils.mk('div', 'mapp-list-empty');
					hint.textContent = this.#i18n.t('searchMinChars');
					contactsList.appendChild(hint);
					return;
				}
				if (q === this.#query) return;
				this.#contacts = [];
				this.#page = 1;
				this.#hasMore = true;
				this.#isLoading = false;
				this.#query = q;
				this.#loadPage(contactsList, currentMode, false, selectedList, createBtn, checkGroupBtn, bottomLoader, openDirectChat);
			}, 300);
		});

		contactsList.addEventListener('scroll', () => {
			const { scrollTop, scrollHeight, clientHeight } = contactsList;
			if (scrollHeight - scrollTop - clientHeight < 60 && !this.#isLoading && this.#hasMore)
				this.#loadPage(contactsList, currentMode, true, selectedList, createBtn, checkGroupBtn, bottomLoader, openDirectChat);
		});

		createBtn.addEventListener('click', async () => {
			if (createInFlight) return;
			if (currentMode === 'direct') {
				return;
			} else {
				const participantIds = [...this.#selectedContacts];
				const name = groupNameInput.value.trim();
				if (!name || !participantIds.length) return;
				createInFlight = true;
				createBtn.disabled = true;
				createBtn.textContent = this.#i18n.t('creating');
				try {
					const chat = await this.#api.createGroup(name, participantIds, {});
					if (chat.keySetupError) {
						const msg = chat.keySetupError.message || '';
						const isCreatorKey = /ваш публичный ключ|your encryption public key/i.test(msg);
						await MessengerDialog.alert({
							title: this.#i18n.t('error') || 'Ошибка',
							message: isCreatorKey
								? this.#i18n.t('groupCreatorMissingEncryption')
								: (msg || this.#i18n.t('groupKeySetupFailed')),
							type: MessengerDialog.TYPE_DANGER,
							themeManager: this.#themeManager,
						});
						delete chat.keySetupError;
					} else if (chat.keySetupWarning > 0) {
						await MessengerDialog.alert({
							title: this.#i18n.t('newChat'),
							message: this.#i18n.t('groupMembersMissingEncryption'),
							themeManager: this.#themeManager,
						});
						delete chat.keySetupWarning;
					}
					close();
					onChatCreated(chat);
				} catch (e) {
					console.warn('[MessengerNewChatModal] createGroup', e);
					await MessengerDialog.alert({
						title: this.#i18n.t('error') || 'Ошибка',
						message: e.message || '',
						type: MessengerDialog.TYPE_DANGER,
						themeManager: this.#themeManager,
					});
					createBtn.disabled = false;
					createBtn.textContent = this.#i18n.t('createGroup');
				} finally {
					createInFlight = false;
				}
			}
		});

		footer.hidden = currentMode === 'direct';
		modal.append(modalHeader, tabs, groupNameWrap, searchWrap, contactsList, bottomLoader, footer);
		overlay.appendChild(modal);
		document.body.appendChild(overlay);

		// Load contacts immediately on open
		this.#loadPage(contactsList, currentMode, false, selectedList, createBtn, checkGroupBtn, bottomLoader, openDirectChat);
	}

	async #loadPage(container, mode, append, selectedList, createBtn, checkGroupBtn, bottomLoader, onDirectContactClick) {
		if (this.#isLoading || !this.#hasMore) return;
		this.#isLoading = true;
		if (bottomLoader) bottomLoader.hidden = false;
		if (!append) {
			container.innerHTML = '';
			const loadingEl = this.#utils.mk('div', 'mapp-modal-loading');
			loadingEl.textContent = this.#i18n.t('loading');
			container.appendChild(loadingEl);
		}
		try {
			const batch = mode === 'group'
				? await this.#api.getChatContacts(this.#page, this.#rowCount, this.#query)
				: await this.#api.getAllContacts(this.#page, this.#rowCount, this.#query);
			if (batch.length < this.#rowCount) this.#hasMore = false;
			if (!batch.length && !append) {
				container.innerHTML = '';
				const empty = this.#utils.mk('div', 'mapp-modal-contacts-empty');
				empty.textContent = this.#query
					? this.#i18n.t('contactsNotFound')
					: (mode === 'group' ? this.#i18n.t('noContacts') : this.#i18n.t('searchContactsHint'));
				container.appendChild(empty);
				return;
			}
			this.#contacts = append ? [...this.#contacts, ...batch] : batch;
			this.#page++;
			if (!append) container.innerHTML = '';
			batch.forEach(c => container.appendChild(
				this.#buildContactItem(c, mode, container, selectedList, createBtn, checkGroupBtn, onDirectContactClick)
			));
		} catch {
			if (!append) {
				container.innerHTML = '';
				const errEl = this.#utils.mk('div', 'mapp-modal-contacts-empty');
				errEl.textContent = this.#i18n.t('contactsLoadError');
				container.appendChild(errEl);
			}
		} finally {
			this.#isLoading = false;
			if (bottomLoader) bottomLoader.hidden = true;
		}
	}

	#buildContactItem(contact, mode, container, selectedList, createBtn, checkGroupBtn, onDirectContactClick) {
		const item = this.#utils.mk('div', 'mapp-modal-contact-item');
		const isSelected = this.#selectedContacts.has(contact.id);
		if (isSelected) item.classList.add('mapp-modal-contact-item--selected');
		const avatar = this.#avatarBuilder.build(contact.id, contact.name, contact.avatar || null, 44);
		const nameEl = this.#utils.mk('span', 'mapp-modal-contact-name');
		nameEl.textContent = contact.name;
		const check = this.#utils.mk('span', 'mapp-modal-contact-check');
		check.innerHTML = isSelected ? this.#icons.check() : '';
		item.append(avatar, nameEl, check);
		if (mode === 'direct') check.hidden = true;

		item.addEventListener('click', () => {
			if (mode === 'direct') {
				if (typeof onDirectContactClick === 'function') onDirectContactClick(contact);
				return;
			} else {
				if (this.#selectedContacts.has(contact.id)) {
					this.#selectedContacts.delete(contact.id);
					item.classList.remove('mapp-modal-contact-item--selected');
					check.innerHTML = '';
				} else {
					this.#selectedContacts.add(contact.id);
					item.classList.add('mapp-modal-contact-item--selected');
					check.innerHTML = this.#icons.check();
				}
				if (checkGroupBtn) checkGroupBtn();
				// Selected users are highlighted in the list; chip row is intentionally hidden.
			}
		});
		return item;
	}

	#redrawContacts(container, mode, selectedList, createBtn, checkGroupBtn, onDirectContactClick) {
		container.innerHTML = '';
		if (!this.#contacts.length) {
			const empty = this.#utils.mk('div', 'mapp-modal-contacts-empty');
			empty.textContent = this.#i18n.t('noContacts');
			container.appendChild(empty);
			return;
		}
		this.#contacts.forEach(c => container.appendChild(
			this.#buildContactItem(c, mode, container, selectedList, createBtn, checkGroupBtn, onDirectContactClick)
		));
	}

	#redrawChips(container, contactsContainer, mode, createBtn, checkGroupBtn) {
		if (!container) return;
		container.innerHTML = '';
		this.#selectedContacts.forEach(id => {
			const contact = this.#contacts.find(c => c.id === id);
			if (!contact) return;
			const chip = this.#utils.mk('div', 'mapp-chip');
			const nameEl = this.#utils.mk('span');
			nameEl.textContent = contact.name;
			const removeBtn = this.#utils.mk('button', 'mapp-chip-remove');
			removeBtn.innerHTML = '×';
			removeBtn.addEventListener('click', () => {
				this.#selectedContacts.delete(id);
				this.#redrawChips(container, contactsContainer, mode, createBtn, checkGroupBtn);
				this.#redrawContacts(contactsContainer, mode, container, createBtn, checkGroupBtn);
				if (checkGroupBtn) checkGroupBtn();
			});
			chip.append(nameEl, removeBtn);
			container.appendChild(chip);
		});
	}
}

class MessengerStickyDateSeparator {
	#msgArea;
	#floatEl;
	#floatPill;
	#observer;
	#aboveSet = new Set();
	#scrollRAF = null;

	constructor(msgArea, msgWrap) {
		this.#msgArea = msgArea;

		const floatEl = document.createElement('div');
		floatEl.className = 'mc-date-separator mc-date-separator--float';
		const pill = document.createElement('span');
		pill.className = 'mc-date-separator-pill';
		floatEl.appendChild(pill);
		msgWrap.appendChild(floatEl);
		this.#floatEl = floatEl;
		this.#floatPill = pill;

		this.#observer = new IntersectionObserver(
			(entries) => this.#onIntersect(entries), {
				root: msgArea,
				threshold: 0
			}
		);

		msgArea.addEventListener('scroll', () => {
			if (this.#scrollRAF) return;
			this.#scrollRAF = requestAnimationFrame(() => {
				this.#scrollRAF = null;
				this.#applyPush();
			});
		});
	}

	observe(sepEl) {
		this.#observer.observe(sepEl);
	}

	unobserveAll() {
		this.#observer.disconnect();
		this.#aboveSet = new Set();
		this.#hide();
	}

	reobserve() {
		this.unobserveAll();
		this.#msgArea.querySelectorAll('[data-date-sep="1"]').forEach(el => this.observe(el));
		this.#update();
	}

	refresh() {
		const rootRect = this.#msgArea.getBoundingClientRect();
		const allInDOM = [...this.#msgArea.querySelectorAll('[data-date-sep="1"]')];
		this.#aboveSet = new Set();
		for (const el of allInDOM) {
			const rect = el.getBoundingClientRect();
			if (rect.top < rootRect.top) {
				this.#aboveSet.add(el);
			}
		}
		this.#update();
	}

	destroy() {
		this.#observer.disconnect();
		this.#floatEl.remove();
		if (this.#scrollRAF) cancelAnimationFrame(this.#scrollRAF);
	}

	#onIntersect(entries) {
		for (const entry of entries) {
			const aboveRoot =
				entry.rootBounds &&
				entry.boundingClientRect.top < entry.rootBounds.top;
			if (!entry.isIntersecting && aboveRoot) {
				this.#aboveSet.add(entry.target);
			} else {
				this.#aboveSet.delete(entry.target);
			}
		}
		this.#update();
	}

	#update() {
		const allInDOM = [...this.#msgArea.querySelectorAll('[data-date-sep="1"]')];
		const aboveSeps = allInDOM.filter(el => this.#aboveSet.has(el));

		if (!aboveSeps.length) {
			this.#hide();
			return;
		}

		const active = aboveSeps[aboveSeps.length - 1];
		const pill = active.querySelector('.mc-date-separator-pill');
		if (!pill) {
			this.#hide();
			return;
		}

		this.#floatPill.textContent = pill.textContent;
		this.#floatPill.title = pill.title || '';
		this.#floatPill.dataset.tooltip = pill.dataset.tooltip || '';
		this.#floatPill.classList.toggle(
			'mc-date-separator-pill--has-tooltip',
			!!pill.dataset.tooltip
		);

		this.#floatEl.hidden = false;
		this.#applyPush();
	}

	#applyPush() {
		if (this.#floatEl.hidden) return;

		const allInDOM = [...this.#msgArea.querySelectorAll('[data-date-sep="1"]')];
		const aboveSeps = allInDOM.filter(el => this.#aboveSet.has(el));
		if (!aboveSeps.length) return;

		const activeIdx = allInDOM.indexOf(aboveSeps[aboveSeps.length - 1]);
		const nextSep = allInDOM[activeIdx + 1];

		this.#floatEl.style.transform = '';
		if (!nextSep) return;

		const floatRect = this.#floatEl.getBoundingClientRect();
		const nextRect = nextSep.getBoundingClientRect();
		const rootTop = this.#msgArea.getBoundingClientRect().top;
		const floatH = floatRect.height;
		const nextRelTop = nextRect.top - rootTop;

		if (nextRelTop < floatH) {
			this.#floatEl.style.transform = `translateY(${nextRelTop - floatH}px)`;
		}
	}

	#hide() {
		this.#floatEl.hidden = true;
		this.#floatEl.style.transform = '';
	}
}

class MessengerFileUploadBubble {
	#utils;
	#icons;
	#i18n;
	#cache;

	constructor(utils, icons, i18n, cache = null) {
		this.#utils = utils;
		this.#icons = icons;
		this.#i18n = i18n;
		this.#cache = cache;
	}

	#setStatusIcon(el, status) {
		el.innerHTML = '';
		el.className = `mc-msg-status mc-msg-status--${status}`;
		if (status === 'sending') el.appendChild(this.#utils.mk('span', 'mc-spinner'));
		else if (status === 'sent') el.innerHTML = this.#icons.checkSingle();
		else if (status === 'read') el.innerHTML = this.#icons.checkDouble();
		else if (status === 'error') {
			el.textContent = '⚠';
			el.title = this.#i18n.t('messageFailed');
		}
	}

	create(file) {
		const isImage = file.type.startsWith('image/');
		const row = this.#utils.mk('div', 'mc-msg-row mc-msg-row--mine mc-file-upload-row');
		const localId = this.#utils.guid();
		row.dataset.localUploadId = localId;

		const bubble = this.#utils.mk('div', 'mc-bubble');
		const icons = this.#icons;
		const cache = this.#cache;
		const utils = this.#utils;
		let objectUrl = null;
		let msgAreaRef = null;
		let progressWrap = null;
		let progressBar = null;
		let footerStatusEl = null;

		const footer = this.#utils.mk('div', 'mc-msg-footer');
		const timeEl = this.#utils.mk('span', 'mc-msg-time');
		timeEl.textContent = this.#utils.formatTime(new Date());
		footer.appendChild(timeEl);
		footerStatusEl = this.#utils.mk('span', 'mc-msg-status');
		this.#setStatusIcon(footerStatusEl, 'sending');
		footer.appendChild(footerStatusEl);

		if (isImage) {
			bubble.classList.add('mc-image-bubble', 'mc-file-upload-bubble');
			objectUrl = URL.createObjectURL(file);
			const img = document.createElement('img');
			img.className = 'mc-bubble-image';
			img.alt = file.name;
			img.src = objectUrl;
			progressWrap = this.#utils.mk('div', 'mc-file-progress-wrap mc-image-upload-progress');
			progressBar = this.#utils.mk('div', 'mc-file-progress-bar');
			progressWrap.appendChild(progressBar);
			bubble.append(img, progressWrap, footer);
		} else {
			bubble.classList.add('mc-file-bubble');
			const header = this.#utils.mk('div', 'mc-file-bubble-header');
			const iconEl = this.#utils.mk('div', 'mc-file-bubble-icon');
			iconEl.innerHTML = this.#icons.fileDoc();
			const meta = this.#utils.mk('div', 'mc-file-bubble-meta');
			const nameEl = this.#utils.mk('div', 'mc-file-bubble-name');
			nameEl.textContent = file.name;
			const sizeEl = this.#utils.mk('div', 'mc-file-bubble-size');
			sizeEl.textContent = this.#formatSize(file.size);
			meta.append(nameEl, sizeEl);
			header.append(iconEl, meta);
			progressWrap = this.#utils.mk('div', 'mc-file-progress-wrap');
			progressBar = this.#utils.mk('div', 'mc-file-progress-bar');
			progressWrap.appendChild(progressBar);
			bubble.append(header, progressWrap, footer);
		}
		row.appendChild(bubble);
		const bubbleFactory = this;

		const bindImageClick = (img, serverUrl) => {
			img.addEventListener('click', (e) => {
				e.stopPropagation();
				MessengerImageViewer.openForChat({
					src: serverUrl || img.dataset.viewerUrl || img.src,
					displaySrc: img.src,
					icons,
					cache,
					msgArea: msgAreaRef,
				});
			});
		};

		if (isImage) {
			const img = bubble.querySelector('.mc-bubble-image');
			bindImageClick(img, null);
		}

		return {
			el: row,
			localId,
			objectUrl,
			progressBar,
			progressWrap,
			setMsgArea(area) { msgAreaRef = area; },
			setProgress(pct) {
				if (progressBar) progressBar.style.width = `${pct}%`;
			},
			setSentStatus(status) {
				if (footerStatusEl) bubbleFactory.#setStatusIcon(footerStatusEl, status);
			},
			setError(msg) {
				if (progressWrap) progressWrap.hidden = true;
				if (footerStatusEl) {
					footerStatusEl.textContent = msg;
					footerStatusEl.className = 'mc-msg-status mc-msg-status--error';
				}
			},
			setComplete(contentType, payload) {
				if (progressWrap) progressWrap.hidden = true;
				if (contentType === MessengerCustomMessage.CONTENT_TYPES.IMAGE) {
					const img = bubble.querySelector('.mc-bubble-image');
					if (img) {
						const serverUrl = MessengerFileService.getFileUrl(payload.fileId);
						img.dataset.viewerUrl = serverUrl;
						img.dataset.fileId = payload.fileId;
						img.replaceWith(img.cloneNode(true));
						const freshImg = bubble.querySelector('.mc-bubble-image');
						freshImg.src = objectUrl || freshImg.src;
						bindImageClick(freshImg, serverUrl);
					}
					this.setSentStatus('sent');
					return;
				}
				bubble.innerHTML = '';
				bubble.className = 'mc-bubble mc-file-bubble';
				const wrap = document.createElement('div');
				wrap.className = 'mc-file-bubble-header mc-file-bubble-clickable';
				const iconEl2 = document.createElement('div');
				iconEl2.className = 'mc-file-bubble-icon';
				iconEl2.innerHTML = icons.fileDoc();
				const meta2 = document.createElement('div');
				meta2.className = 'mc-file-bubble-meta';
				const name2 = document.createElement('div');
				name2.className = 'mc-file-bubble-name';
				name2.textContent = payload.fileName;
				const size2 = document.createElement('div');
				size2.className = 'mc-file-bubble-size';
				size2.textContent = MessengerFileUploadBubble.formatSize(payload.fileSize);
				meta2.append(name2, size2);
				wrap.append(iconEl2, meta2);
				wrap.addEventListener('click', () => {
					const a = document.createElement('a');
					a.href = MessengerFileService.getFileUrl(payload.fileId);
					a.download = payload.fileName;
					a.target = '_blank';
					a.click();
				});
				bubble.append(wrap, footer);
				this.setSentStatus('sent');
			},
		};
	}

	#formatSize(bytes) {
		return MessengerFileUploadBubble.formatSize(bytes);
	}

	static formatSize(bytes) {
		if (!bytes) return '';
		if (bytes < 1024) return `${bytes} B`;
		if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
		return `${(bytes / 1048576).toFixed(2)} MB`;
	}
}

class MessengerFileHandler {
	#utils;
	#icons;
	#i18n;
	#api;
	#cache;
	#bubbleFactory;

	constructor(utils, icons, i18n, api, cache = null) {
		this.#utils = utils;
		this.#icons = icons;
		this.#i18n = i18n;
		this.#api = api;
		this.#cache = cache;
		this.#bubbleFactory = new MessengerFileUploadBubble(utils, icons, i18n, cache);
	}

	#getBpmCsrf() {
		return MessengerAppContext.getBpmCsrf();
	}

	upload(type, chatId, msgArea, appendBubbleCallback, onMessageSent = null) {
		if (typeof FileUploader === 'undefined') {
			console.warn('[MessengerFileHandler] FileUploader not found');
			return;
		}

		const fileId = FileUploader.generateGUID();
		const isCamera = type === 'camera';
		let capturedFile = null;
		let bubbleCtrl = null;
		let bubbleCreated = false;

		const ensureBubble = () => {
			if (bubbleCreated || !capturedFile) return;
			bubbleCreated = true;
			bubbleCtrl = this.#bubbleFactory.create(capturedFile);
			bubbleCtrl.setMsgArea(msgArea);
			bubbleCtrl.el._uploadCtrl = bubbleCtrl;
			appendBubbleCallback(bubbleCtrl.el);
			if (msgArea) msgArea.scrollTop = msgArea.scrollHeight;
		};

		const primaryUploadUrl = MessengerAppContext.toAbsoluteUrl('/api/files/upload');
		const fallbackUploadUrl = MessengerAppContext.toAbsoluteUrl('/api/files/upload');
		const uploadToken = `fileapi${Date.now()}`;
		let selectedFile = null;
		let fallbackStarted = false;

		const buildOptions = (url, uploadFile) => {
			const opts = {
				url,
				headers: {
					'BPMCSRF': this.#getBpmCsrf()
				},
				chunkSize: 0,
				data: {
					[uploadToken]: '',
					fileId: () => fileId,
					totalFileLength: (file) => {
						capturedFile = file;
						return file.size;
					},
					mimeType: (file) => {
						capturedFile = file;
						return file.type;
					},
					fileName: (file) => {
						capturedFile = file;
						return file.name;
					},
					columnName: 'Data',
					parentColumnName: 'SupraChat',
					parentColumnValue: chatId,
					additionalParams: null,
					entitySchemaName: 'SupraFileChatMessage',
				},
			};

			if (uploadFile) {
				opts.file = uploadFile;
				return opts;
			}

			if (isCamera) {
				opts.openCamera = true;
			} else {
				opts.openFilePicker = true;
			}

			return opts;
		};

		const startUpload = (opts) => {
			const task = FileUploader.upload(opts);

			task.on('selected', (files) => {
				selectedFile = (files && files.length > 0) ? files[0] : null;
				if (selectedFile) {
					capturedFile = selectedFile;
					ensureBubble();
					if (bubbleCtrl) bubbleCtrl.setMsgArea(msgArea);
				}
			});

			task.on('progress', (e) => {
				ensureBubble();
				if (bubbleCtrl) {
					bubbleCtrl.setMsgArea(msgArea);
					bubbleCtrl.setProgress(e.percent);
				}
			});

			task.on('complete', async (error) => {
				ensureBubble();
				if (error) {
					if (error.httpStatus === 404 && !fallbackStarted && selectedFile) {
						fallbackStarted = true;
						startUpload(buildOptions(fallbackUploadUrl, selectedFile));
						return;
					}
					if (bubbleCtrl) bubbleCtrl.setError(error.message || this.#i18n.t('uploadError'));
					return;
				}
				const file = capturedFile;
				const isImage = file?.type?.startsWith('image/');
				const contentType = isImage ?
					MessengerCustomMessage.CONTENT_TYPES.IMAGE :
					MessengerCustomMessage.CONTENT_TYPES.FILE;
				const payload = {
					fileId,
					fileName: file?.name ?? '',
					fileSize: file?.size ?? 0,
					mimeType: file?.type ?? '',
					chatId
				};
				if (bubbleCtrl) {
					bubbleCtrl.setComplete(contentType, payload);
					bubbleCtrl.setSentStatus('sending');
				}
				if (msgArea) MessengerUtils.scrollToBottom(msgArea);
				const messageText = MessengerCustomMessage.pack(contentType, payload);
				const localId = bubbleCtrl?.localId ?? this.#utils.guid();
				try {
					const serverMsg = await this.#api.sendMessage(chatId, messageText, localId);
					if (serverMsg?.id && bubbleCtrl) {
						bubbleCtrl.setSentStatus(serverMsg.status || 'sent');
						if (bubbleCtrl.el) {
							onMessageSent?.(chatId, localId, serverMsg, bubbleCtrl.el, messageText);
						}
					}
				} catch (e) {
					if (bubbleCtrl) bubbleCtrl.setError(e.message || this.#i18n.t('uploadError'));
				}
			});
		};

		startUpload(buildOptions(primaryUploadUrl, null));
	}
}

class MessengerThemeManager {
	static #configuredThemes = null;
	static #defaultThemeName = null;
	static THEME_VAR_SELECTORS = [
		'.mapp-root',
		'.mapp-chat-panel',
		'.mc-root',
		'.mc-panel-window',
		'.mapp-modal',
		'.mapp-modal-overlay',
		'.mapp-modal-overlay .mapp-modal',
		'.mapp-modal-overlay .mc-panel-window',
		'.mapp-settings-content',
		'.mapp-folder-settings',
		'.mapp-profile-window-content',
		'.mapp-profile-panels',
		'.mapp-profile-tab-panel',
		'.mc-action-menu',
		'.mapp-bottom-sheet',
		'.mapp-app-logo--svg-themed',
		'.mc-dialog-overlay .mc-dialog',
		'.mc-menu',
		'.mc-img-viewer',
	].join(', ');

	#themeStyleEl = null;
	#lastThemeCss = '';

	static configure({ themes, defaultThemeName } = {}) {
		if (Array.isArray(themes) && themes.length) {
			MessengerThemeManager.#configuredThemes = themes;
		}
		if (defaultThemeName) {
			MessengerThemeManager.#defaultThemeName = defaultThemeName;
		}
	}

	static getThemeList() {
		return MessengerThemeManager.#configuredThemes?.length
			? MessengerThemeManager.#configuredThemes
			: MessengerThemeManager.DEFAULT_THEMES;
	}

	static parseHexColor(input) {
		if (!input || typeof input !== 'string') return null;
		let hex = input.trim();
		if (hex.startsWith('#')) hex = hex.slice(1);
		if (hex.length === 3) hex = [...hex].map(c => c + c).join('');
		if (!/^[0-9a-f]{6}$/i.test(hex)) return null;
		return {
			r: parseInt(hex.slice(0, 2), 16),
			g: parseInt(hex.slice(2, 4), 16),
			b: parseInt(hex.slice(4, 6), 16),
		};
	}

	static isThemeDark(theme) {
		if (!theme) return false;
		const rgb = MessengerThemeManager.parseHexColor(theme.bodyBg || theme.headerBg);
		if (!rgb) {
			const name = String(theme.name || '');
			return /тём/i.test(name) || /dark/i.test(name);
		}
		const lum = (0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b) / 255;
		return lum < 0.45;
	}

	static DEFAULT_THEMES = [{
			name: 'Светлая',
			bodyBg: '#e8eaed',
			headerBg: '#ffffff',
			chatBg: '#f0f2f5',
			myBubbleBg: '#4a7fc1',
			myBubbleText: '#ffffff',
			otherBubbleBg: '#ffffff',
			otherBubbleText: '#1c1c1e',
			accent: '#4a7fc1',
			inputBg: '#ffffff',
			inputFieldBg: '#f0f2f5',
			inputFieldBorder: 'rgba(0,0,0,.1)',
			inputText: '#1c1c1e',
			inputPlaceholder: '#aaaaaa',
			headerText: '#1c1c1e',
			headerSubText: '#8e8e93',
			headerBorder: 'rgba(0,0,0,.08)',
			inputAreaBorder: 'rgba(0,0,0,.07)',
			scrollThumb: 'rgba(0,0,0,.15)',
			senderName: '#4a7fc1',
			menuBg: '#ffffff',
			menuText: '#1c1c1e',
			menuBorder: 'rgba(0,0,0,.1)',
			menuHover: 'rgba(0,0,0,.05)',
			dotsColor: '#555',
		},
		{
			name: 'Зелёная',
			bodyBg: '#dde8e0',
			headerBg: '#f4faf6',
			chatBg: '#e4ede7',
			myBubbleBg: '#2d8a60',
			myBubbleText: '#ffffff',
			otherBubbleBg: '#ffffff',
			otherBubbleText: '#1a2e24',
			accent: '#2d8a60',
			inputBg: '#f4faf6',
			inputFieldBg: '#e4ede7',
			inputFieldBorder: 'rgba(0,0,0,.1)',
			inputText: '#1a2e24',
			inputPlaceholder: '#8aab97',
			headerText: '#1a2e24',
			headerSubText: '#6a9b80',
			headerBorder: 'rgba(0,0,0,.07)',
			inputAreaBorder: 'rgba(0,0,0,.06)',
			scrollThumb: 'rgba(0,0,0,.12)',
			senderName: '#2d8a60',
			menuBg: '#ffffff',
			menuText: '#1a2e24',
			menuBorder: 'rgba(0,0,0,.1)',
			menuHover: 'rgba(0,0,0,.05)',
			dotsColor: '#555',
		},
		{
			name: 'Сиреневая',
			bodyBg: '#ddd8ea',
			headerBg: '#f8f6ff',
			chatBg: '#ede9f8',
			myBubbleBg: '#7c5cbf',
			myBubbleText: '#ffffff',
			otherBubbleBg: '#ffffff',
			otherBubbleText: '#1e1a2e',
			accent: '#7c5cbf',
			inputBg: '#f8f6ff',
			inputFieldBg: '#ede9f8',
			inputFieldBorder: 'rgba(0,0,0,.1)',
			inputText: '#1e1a2e',
			inputPlaceholder: '#9d8fbf',
			headerText: '#1e1a2e',
			headerSubText: '#8a7aaa',
			headerBorder: 'rgba(0,0,0,.07)',
			inputAreaBorder: 'rgba(0,0,0,.06)',
			scrollThumb: 'rgba(0,0,0,.12)',
			senderName: '#7c5cbf',
			menuBg: '#ffffff',
			menuText: '#1e1a2e',
			menuBorder: 'rgba(0,0,0,.1)',
			menuHover: 'rgba(0,0,0,.05)',
			dotsColor: '#555',
		},
		{
			name: 'Тёмная',
			bodyBg: '#18191c',
			headerBg: '#242526',
			chatBg: '#18191c',
			myBubbleBg: '#3a7bd5',
			myBubbleText: '#ffffff',
			otherBubbleBg: '#2e2f33',
			otherBubbleText: '#e4e6eb',
			accent: '#3a7bd5',
			inputBg: '#242526',
			inputFieldBg: '#3a3b3c',
			inputFieldBorder: 'rgba(255,255,255,.08)',
			inputText: '#e4e6eb',
			inputPlaceholder: '#6b6c6f',
			headerText: '#e4e6eb',
			headerSubText: '#6b6c6f',
			headerBorder: 'rgba(255,255,255,.06)',
			inputAreaBorder: 'rgba(255,255,255,.06)',
			scrollThumb: 'rgba(255,255,255,.12)',
			senderName: '#5b9bd5',
			menuBg: '#2e2f33',
			menuText: '#e4e6eb',
			menuBorder: 'rgba(255,255,255,.1)',
			menuHover: 'rgba(255,255,255,.07)',
			dotsColor: '#aaa',
		},
		{
			name: 'Тёмно-зелёная',
			bodyBg: '#111a14',
			headerBg: '#1a2620',
			chatBg: '#111a14',
			myBubbleBg: '#1f8c5a',
			myBubbleText: '#ffffff',
			otherBubbleBg: '#1e2d25',
			otherBubbleText: '#cde8d8',
			accent: '#1f8c5a',
			inputBg: '#1a2620',
			inputFieldBg: '#243328',
			inputFieldBorder: 'rgba(255,255,255,.07)',
			inputText: '#cde8d8',
			inputPlaceholder: '#4d7a5e',
			headerText: '#cde8d8',
			headerSubText: '#4d7a5e',
			headerBorder: 'rgba(255,255,255,.05)',
			inputAreaBorder: 'rgba(255,255,255,.05)',
			scrollThumb: 'rgba(255,255,255,.1)',
			senderName: '#3ec87a',
			menuBg: '#1e2d25',
			menuText: '#cde8d8',
			menuBorder: 'rgba(255,255,255,.08)',
			menuHover: 'rgba(255,255,255,.07)',
			dotsColor: '#8ab8a0',
		},
		{
			name: 'Тёмно-фиолетовая',
			bodyBg: '#12101a',
			headerBg: '#1c1828',
			chatBg: '#12101a',
			myBubbleBg: '#6b4fcf',
			myBubbleText: '#ffffff',
			otherBubbleBg: '#201d30',
			otherBubbleText: '#d8d0f0',
			accent: '#6b4fcf',
			inputBg: '#1c1828',
			inputFieldBg: '#28223c',
			inputFieldBorder: 'rgba(255,255,255,.07)',
			inputText: '#d8d0f0',
			inputPlaceholder: '#6a5e8a',
			headerText: '#d8d0f0',
			headerSubText: '#6a5e8a',
			headerBorder: 'rgba(255,255,255,.05)',
			inputAreaBorder: 'rgba(255,255,255,.05)',
			scrollThumb: 'rgba(255,255,255,.1)',
			senderName: '#a07aff',
			menuBg: '#201d30',
			menuText: '#d8d0f0',
			menuBorder: 'rgba(255,255,255,.08)',
			menuHover: 'rgba(255,255,255,.07)',
			dotsColor: '#a090cc',
		},
		{
			name: 'Тёмно-синяя',
			bodyBg: '#0d1117',
			headerBg: '#161b22',
			chatBg: '#0d1117',
			myBubbleBg: '#1f6feb',
			myBubbleText: '#ffffff',
			otherBubbleBg: '#21262d',
			otherBubbleText: '#c9d1d9',
			accent: '#1f6feb',
			inputBg: '#161b22',
			inputFieldBg: '#21262d',
			inputFieldBorder: 'rgba(255,255,255,.08)',
			inputText: '#c9d1d9',
			inputPlaceholder: '#484f58',
			headerText: '#c9d1d9',
			headerSubText: '#484f58',
			headerBorder: 'rgba(255,255,255,.06)',
			inputAreaBorder: 'rgba(255,255,255,.06)',
			scrollThumb: 'rgba(255,255,255,.1)',
			senderName: '#58a6ff',
			menuBg: '#21262d',
			menuText: '#c9d1d9',
			menuBorder: 'rgba(255,255,255,.1)',
			menuHover: 'rgba(255,255,255,.07)',
			dotsColor: '#8b949e',
		},
	];

	#current;
	#storageKey;

	constructor(storageKey) {
		this.#storageKey = storageKey;
		const saved = (() => {
			try {
				return localStorage.getItem(storageKey);
			} catch {
				return null;
			}
		})();
		const list = MessengerThemeManager.getThemeList();
		const defaultName = MessengerThemeManager.#defaultThemeName;
		this.#current = list.find(t => t.name === saved) ??
			(defaultName ? list.find(t => t.name === defaultName) : null) ??
			list[0];
	}

	get current() {
		return this.#current;
	}
	get themes() {
		return MessengerThemeManager.getThemeList();
	}

	apply(theme) {
		this.#current = theme;
		try {
			localStorage.setItem(this.#storageKey, theme.name);
		} catch {}
		this.#publishThemeVars();
	}

	applyTheme(theme) {
		this.apply(theme);
		this.refreshDom();
	}

	refreshDom() {
		this.#publishThemeVars();
	}

	#collectThemeVars() {
		const t = this.#current;
		if (!t) return {};
		return {
			'--m-header-bg': t.headerBg,
			'--m-chat-bg': t.chatBg,
			'--m-my-bubble-bg': t.myBubbleBg,
			'--m-my-bubble-text': t.myBubbleText,
			'--m-other-bubble-bg': t.otherBubbleBg,
			'--m-other-bubble-text': t.otherBubbleText,
			'--m-accent': t.accent,
			'--m-input-bg': t.inputBg,
			'--m-input-field-bg': t.inputFieldBg,
			'--m-input-field-border': t.inputFieldBorder,
			'--m-input-text': t.inputText,
			'--m-input-placeholder': t.inputPlaceholder,
			'--m-header-text': t.headerText,
			'--m-header-border': t.headerBorder,
			'--m-input-area-border': t.inputAreaBorder,
			'--m-scroll-thumb': t.scrollThumb,
			'--m-sender-name': t.senderName || t.accent,
			'--m-menu-bg': t.menuBg,
			'--m-menu-text': t.menuText,
			'--m-menu-border': t.menuBorder,
			'--m-menu-hover': t.menuHover,
			'--m-dots-color': t.dotsColor,
			'--mapp-sidebar-bg': t.headerBg,
			'--mapp-content-bg': t.chatBg,
			'--mapp-accent': t.accent,
			'--mapp-text': t.headerText,
			'--mapp-sub-text': t.headerSubText,
			'--mapp-border': t.headerBorder,
			'--mapp-hover': t.menuHover,
			'--mapp-input-bg': t.inputFieldBg,
			'--mapp-input-text': t.inputText,
			'--mapp-input-border': t.inputFieldBorder,
			'--mapp-scroll-thumb': t.scrollThumb,
			'--mapp-item-active-bg': t.myBubbleBg + '22',
			'--mapp-dots': t.dotsColor,
			'--mapp-user-hover': t.menuHover,
			'--mapp-logo-color': MessengerThemeManager.isThemeDark(t) ? '#ffffff' : '#000000',
		};
	}

	#ensureThemeStyleEl() {
		if (!this.#themeStyleEl) {
			this.#themeStyleEl = document.createElement('style');
			this.#themeStyleEl.id = 'supra-messenger-theme';
			document.head.appendChild(this.#themeStyleEl);
		}
		return this.#themeStyleEl;
	}

	#stripInlineThemeVars() {
		const keys = Object.keys(this.#collectThemeVars());
		document.querySelectorAll(MessengerThemeManager.THEME_VAR_SELECTORS).forEach((node) => {
			keys.forEach((k) => node.style.removeProperty(k));
		});
		document.body.style.removeProperty('background');
	}

	#publishThemeVars() {
		this.#syncRootThemeClass();
		const vars = this.#collectThemeVars();
		const lines = Object.entries(vars)
			.filter(([, v]) => v != null && v !== '')
			.map(([k, v]) => `  ${k}: ${v};`);
		let css = `${MessengerThemeManager.THEME_VAR_SELECTORS} {\n${lines.join('\n')}\n}`;
		const bodyBg = this.#current?.bodyBg;
		if (bodyBg) {
			css += `\nbody.sm-messenger-active { background: ${bodyBg}; }\n`;
		}
		if (css === this.#lastThemeCss) return;
		this.#lastThemeCss = css;
		this.#ensureThemeStyleEl().textContent = css;
		this.#stripInlineThemeVars();
	}

	#syncRootThemeClass() {
		const dark = MessengerThemeManager.isThemeDark(this.#current);
		document.querySelectorAll('.mapp-root').forEach((el) => {
			el.classList.toggle('mapp-theme-dark', dark);
		});
	}

	syncThemeSubmenu(menuEl) {
		if (!menuEl) return;
		const themeNames = new Set(this.themes.map(t => t.name));
		menuEl.querySelectorAll('.mc-action-submenu .mc-action-menu-item').forEach((item) => {
			const id = item.dataset.menuItemId;
			if (!id || !themeNames.has(id)) return;
			item.classList.toggle('mc-action-menu-item--active', id === this.current.name);
		});
	}

	applyChatVars(_rootEl) {
		this.#publishThemeVars();
	}

	applyAppVars(_rootEl) {
		this.#publishThemeVars();
	}

	buildDropdown(utils, icons, i18n, onApply, targetRootEl) {
		const menu = utils.mk('div', 'mc-menu');
		const closeSubmenus = () => {
			menu.querySelectorAll('.mc-submenu--open')
				.forEach(el => el.classList.remove('mc-submenu--open'));
		};
		const themeItem = utils.mk('div', 'mc-menu-item mc-menu-item--sub');
		const label = utils.mk('span');
		label.textContent = i18n.t('theme');
		const arrow = utils.mk('span', 'mc-menu-arrow');
		arrow.innerHTML = '›';
		themeItem.append(label, arrow);
		const submenu = utils.mk('div', 'mc-submenu');
		this.themes.forEach(theme => {
			const item = utils.mk('div', 'mc-menu-item');
			item.textContent = theme.name;
			if (theme.name === this.#current.name) item.classList.add('mc-menu-item--active');
			item.addEventListener('click', e => {
				e.stopPropagation();
				submenu.querySelectorAll('.mc-menu-item').forEach(i => i.classList.remove('mc-menu-item--active'));
				item.classList.add('mc-menu-item--active');
				this.applyTheme(theme);
				if (targetRootEl) this.refreshDom(targetRootEl);
				menu.classList.remove('mc-menu--open');
				closeSubmenus();
			});
			submenu.appendChild(item);
		});
		themeItem.addEventListener('click', e => {
			e.stopPropagation();
			submenu.classList.toggle('mc-submenu--open');
		});
		themeItem.appendChild(submenu);
		menu.appendChild(themeItem);
		menu.closeSubmenus = closeSubmenus;
		return menu;
	}
}

class MessengerAvatarBuilder {
	#utils;

	constructor(utils) {
		this.#utils = utils;
	}

	build(id, name, base64, size) {
		const wrap = this.#utils.mk('div', 'mc-avatar');
		MessengerUtils.setAvatarSize(wrap, size);
		if (base64) {
			const img = document.createElement('img');
			img.className = 'mc-avatar-img';
			img.src = base64;
			wrap.appendChild(img);
		} else {
			const ini = this.#utils.mk('span', 'mc-avatar-initials');
			ini.textContent = this.#utils.initials(name || '?');
			wrap.style.setProperty('--mc-avatar-bg', this.#utils.avatarColor(id || 'x'));
			wrap.appendChild(ini);
		}
		return wrap;
	}

	buildWithPresence(id, name, base64, size, presence) {
		const wrap = this.#utils.mk('div', 'mc-avatar-wrap');
		MessengerUtils.setAvatarSize(wrap, size);
		wrap.appendChild(this.build(id, name, base64, size));
		if (presence === 'online' || presence === 'idle') {
			const dot = this.#utils.mk('span', 'mc-presence-dot');
			dot.classList.add(presence === 'idle' ? 'mc-presence-dot--idle' : 'mc-presence-dot--online');
			wrap.appendChild(dot);
		}
		return wrap;
	}
}


class MessengerCustomMessage {
	static TAG = 'mc-content';
	static CONTENT_TYPES = {
		FILE: 'file',
		IMAGE: 'image',
		DATE_SEPARATOR: 'date_separator',
		SYSTEM_EVENT: 'system_event',
	};
	static pack(contentType, payload) {
		return `<${MessengerCustomMessage.TAG} type="${contentType}">${JSON.stringify(payload)}</${MessengerCustomMessage.TAG}>`;
	}
	static parse(text) {
		if (!text) return null;
		const re = new RegExp(
			`<${MessengerCustomMessage.TAG}[^>]*type="([^"]+)"[^>]*>([\\s\\S]*?)<\\/${MessengerCustomMessage.TAG}>`
		);
		const m = text.match(re);
		if (!m) return null;
		try {
			return {
				contentType: m[1],
				payload: JSON.parse(m[2])
			};
		} catch {
			return null;
		}
	}
	static isCustom(text) {
		return typeof text === 'string' && text.includes(`<${MessengerCustomMessage.TAG}`);
	}
	static extractImagePayload(text) {
		const parsed = MessengerCustomMessage.parse(text);
		if (!parsed || parsed.contentType !== MessengerCustomMessage.CONTENT_TYPES.IMAGE) return null;
		return parsed.payload?.fileId ? parsed.payload : null;
	}
	static toPreview(text) {
		if (!text) return '';
		if (typeof SupraCrypto !== 'undefined' && SupraCrypto.isEncrypted(text)) {
			return SupraCrypto.LOCKED_PREVIEW;
		}
		const parsed = MessengerCustomMessage.parse(text);
		if (parsed) {
			if (parsed.contentType === MessengerCustomMessage.CONTENT_TYPES.IMAGE)
				return '🖼 ' + (parsed.payload.fileName || 'Изображение');
			if (parsed.contentType === MessengerCustomMessage.CONTENT_TYPES.SYSTEM_EVENT)
				return '';
			return '📎 ' + (parsed.payload.fileName || 'File');
		}
		return text
			.replace(/<[^>]+>/g, '')
			.replace(/&/g, '&').replace(/</g, '<').replace(/>/g, '>')
			.replace(/"/g, '"').replace(/'/g, "'").replace(/ /g, ' ')
			.trim();
	}
	static separatorId(date) {
		const d = date instanceof Date ? date : new Date(date);
		return `date-sep-${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
	}
	static midnightOf(date) {
		const d = new Date(date);
		d.setHours(0, 0, 0, 0);
		return d;
	}
	static createSeparatorRecord(date) {
		const midnight = MessengerCustomMessage.midnightOf(date);
		return {
			id: MessengerCustomMessage.separatorId(midnight),
			isVirtual: true,
			contentType: MessengerCustomMessage.CONTENT_TYPES.DATE_SEPARATOR,
			timestamp: midnight,
			text: '',
			isOwn: false,
			senderId: null,
			senderName: null,
			senderAvatar: null,
			status: 'read',
		};
	}
	static isDateSeparator(msg) {
		return msg?.contentType === MessengerCustomMessage.CONTENT_TYPES.DATE_SEPARATOR ||
			msg?.isVirtual === true;
	}
	static isSystemEvent(msg) {
		if (msg?.contentType === MessengerCustomMessage.CONTENT_TYPES.SYSTEM_EVENT) return true;
		const parsed = MessengerCustomMessage.parse(msg?.text);
		return parsed?.contentType === MessengerCustomMessage.CONTENT_TYPES.SYSTEM_EVENT;
	}
}

function buildQuotePreviewContent({ utils, cache, previewText, locked, lockedLabel }) {
	const prev = previewText || '';
	if (locked) {
		const el = utils.mk('div', 'mc-msg-quote-text mc-msg-quote-text--locked');
		el.textContent = lockedLabel || prev;
		return el;
	}
	const imagePayload = MessengerCustomMessage.extractImagePayload(prev);
	if (imagePayload) {
		const wrap = utils.mk('div', 'mc-msg-quote-preview mc-msg-quote-preview--image');
		const img = document.createElement('img');
		img.className = 'mc-msg-quote-thumb';
		img.alt = imagePayload.fileName || '';
		const url = MessengerFileService.getFileUrl(imagePayload.fileId);
		if (cache) cache.applyThumbnailSrc(img, url);
		else img.src = url;
		wrap.appendChild(img);
		return wrap;
	}
	const preview = utils.mk('div', 'mc-msg-quote-text');
	const display = MessengerCustomMessage.isCustom(prev)
		? MessengerCustomMessage.toPreview(prev)
		: prev;
	preview.textContent = display;
	return preview;
}

function resolveReplyTextPreview(msg) {
	const raw = (msg?.text || '').replace(/\s+/g, ' ').trim();
	if (!raw) return '';
	if (MessengerCustomMessage.extractImagePayload(raw)) return raw;
	if (MessengerCustomMessage.isCustom(raw)) return MessengerCustomMessage.toPreview(raw);
	return raw.length > 120 ? raw.slice(0, 120) + '…' : raw;
}

/** Долгое нажатие на изображение в чате (мобильный вид) — меню сообщения; короткий тап — просмотр. */
function bindImageLongPressMenu(img, openMenu) {
	if (!img || typeof openMenu !== 'function' || !isMobileSheetMenu()) return;
	let pressTimer = null;
	let suppressNextClick = false;
	let startX = 0;
	let startY = 0;
	const LONG_PRESS_MS = 400;
	const SLOP_PX = 12;

	const clearTimer = () => {
		if (pressTimer != null) {
			clearTimeout(pressTimer);
			pressTimer = null;
		}
	};

	img.addEventListener('pointerdown', (e) => {
		if (e.button !== 0) return;
		suppressNextClick = false;
		startX = e.clientX;
		startY = e.clientY;
		clearTimer();
		pressTimer = setTimeout(() => {
			pressTimer = null;
			suppressNextClick = true;
			openMenu(e);
		}, LONG_PRESS_MS);
	});

	img.addEventListener('pointermove', (e) => {
		if (pressTimer == null) return;
		const dx = e.clientX - startX;
		const dy = e.clientY - startY;
		if (dx * dx + dy * dy > SLOP_PX * SLOP_PX) clearTimer();
	});

	img.addEventListener('pointerup', clearTimer);
	img.addEventListener('pointercancel', clearTimer);

	img.addEventListener('click', (e) => {
		if (!suppressNextClick) return;
		e.preventDefault();
		e.stopPropagation();
		suppressNextClick = false;
	}, true);
}

/** Превью в списке чатов: без «удалено», шифротекст — только замок (без расшифровки). */
class MessengerChatListPreview {
	static storageText(msg) {
		if (!msg || msg.deletedForEveryone) return null;
		if (msg._encText) return msg._encText;
		const t = msg.text;
		if (typeof SupraCrypto !== 'undefined' && SupraCrypto.isEncrypted(t)) return t;
		return typeof t === 'string' ? t : '';
	}

	static isLockedStorage(text) {
		return typeof SupraCrypto !== 'undefined' && !!text && SupraCrypto.isEncrypted(text);
	}

	static pickLastVisibleMessage(messages) {
		if (!Array.isArray(messages) || !messages.length) return null;
		const sorted = [...messages].sort((a, b) => {
			const ta = (a.timestamp instanceof Date ? a.timestamp : new Date(a.timestamp)).getTime();
			const tb = (b.timestamp instanceof Date ? b.timestamp : new Date(b.timestamp)).getTime();
			return tb - ta;
		});
		for (const m of sorted) {
			if (m.isVirtual || MessengerCustomMessage.isDateSeparator(m)) continue;
			if (MessengerCustomMessage.isSystemEvent(m)) continue;
			if (m.deletedForEveryone) continue;
			const stored = MessengerChatListPreview.storageText(m);
			if (stored === null) continue;
			if (!stored.trim() && !MessengerChatListPreview.isLockedStorage(stored)) continue;
			return m;
		}
		return null;
	}

	static lockedPreviewLabel(i18n) {
		return i18n?.t('msgHiddenProtected') || SupraCrypto.LOCKED_PREVIEW;
	}

	static getDisplay(storedText, i18n) {
		if (!storedText) return { text: '', locked: false };
		if (
			storedText === SupraCrypto.LOCKED_PREVIEW
			|| storedText === SupraCrypto.LOCKED_OTHER
		) {
			return { text: MessengerChatListPreview.lockedPreviewLabel(i18n), locked: true };
		}
		if (MessengerChatListPreview.isLockedStorage(storedText)) {
			return { text: MessengerChatListPreview.lockedPreviewLabel(i18n), locked: true };
		}
		return { text: MessengerCustomMessage.toPreview(storedText), locked: false };
	}
}

class MessengerImageViewer {
	static #overlay = null;
	static #keyHandler = null;
	static #popHandler = null;
	static #historyPushed = false;
	static #gallery = [];
	static #galleryIndex = 0;
	static #displaySrcMap = null;
	static #cacheRef = null;
	static #iconsRef = null;
	static #swipeStart = null;

	static #touch = {
		scale: 1,
		lastScale: 1,
		originX: 0,
		originY: 0,
		lastOriginX: 0,
		lastOriginY: 0,
		startDist: 0,
		startMidX: 0,
		startMidY: 0,
		dragStartX: 0,
		dragStartY: 0,
		isDragging: false,
		isPinching: false,
		didMove: false,
		lastTap: 0,
		pinchCooldownUntil: 0,
	};

	static #dist(t1, t2) {
		return Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
	}
	static #mid(t1, t2) {
		return {
			x: (t1.clientX + t2.clientX) / 2,
			y: (t1.clientY + t2.clientY) / 2
		};
	}

	static #runTransformTransition(img, fast = false) {
		img.classList.add(fast ? 'mc-img-viewer-img--animate-fast' : 'mc-img-viewer-img--animate');
		window.setTimeout(() => {
			img.classList.remove('mc-img-viewer-img--animate', 'mc-img-viewer-img--animate-fast');
		}, fast ? 220 : 260);
	}

	static #applyTransform(img) {
		const {
			scale,
			originX,
			originY
		} = MessengerImageViewer.#touch;
		img.style.transform = `translate(${originX}px, ${originY}px) scale(${scale})`;
	}

	static #clampOrigin() {
		const t = MessengerImageViewer.#touch;
		const maxX = (window.innerWidth * t.scale) / 2;
		const maxY = (window.innerHeight * t.scale) / 2;
		t.originX = Math.max(-maxX, Math.min(maxX, t.originX));
		t.originY = Math.max(-maxY, Math.min(maxY, t.originY));
	}

	static #setupTouchZoom(img, overlay) {
		const t = MessengerImageViewer.#touch;
		overlay.addEventListener('touchmove', e => e.preventDefault(), {
			passive: false
		});
		img.addEventListener('touchstart', e => {
			e.preventDefault();
			t.didMove = false;
			if (e.touches.length === 2) {
				t.isPinching = true;
				t.isDragging = false;
				t.startDist = MessengerImageViewer.#dist(e.touches[0], e.touches[1]);
				const m = MessengerImageViewer.#mid(e.touches[0], e.touches[1]);
				t.startMidX = m.x;
				t.startMidY = m.y;
				t.lastScale = t.scale;
				t.lastOriginX = t.originX;
				t.lastOriginY = t.originY;
			} else if (e.touches.length === 1) {
				t.isPinching = false;
				const now = Date.now();
				if (now - t.lastTap < 280) {
					t.lastTap = 0;
					t.didMove = true;
					if (t.scale !== 1) {
						t.scale = 1;
						t.originX = 0;
						t.originY = 0;
						MessengerImageViewer.#runTransformTransition(img);
					} else {
						const rect = img.getBoundingClientRect();
						t.scale = 2.5;
						t.originX = (rect.left + rect.width / 2 - e.touches[0].clientX) * (t.scale - 1) / t.scale;
						t.originY = (rect.top + rect.height / 2 - e.touches[0].clientY) * (t.scale - 1) / t.scale;
						MessengerImageViewer.#runTransformTransition(img);
					}
					MessengerImageViewer.#applyTransform(img);
					return;
				}
				t.lastTap = now;
				t.isDragging = true;
				t.dragStartX = e.touches[0].clientX - t.originX;
				t.dragStartY = e.touches[0].clientY - t.originY;
			}
		}, {
			passive: false
		});
		img.addEventListener('touchmove', e => {
			e.preventDefault();
			t.didMove = true;
			if (e.touches.length === 2 && t.isPinching) {
				const dist = MessengerImageViewer.#dist(e.touches[0], e.touches[1]);
				const m = MessengerImageViewer.#mid(e.touches[0], e.touches[1]);
				t.scale = Math.max(0.5, Math.min(6, t.lastScale * (dist / t.startDist)));
				t.originX = t.lastOriginX + (m.x - t.startMidX);
				t.originY = t.lastOriginY + (m.y - t.startMidY);
				MessengerImageViewer.#applyTransform(img);
			} else if (e.touches.length === 1 && t.isDragging && t.scale > 1) {
				t.originX = e.touches[0].clientX - t.dragStartX;
				t.originY = e.touches[0].clientY - t.dragStartY;
				MessengerImageViewer.#clampOrigin();
				MessengerImageViewer.#applyTransform(img);
			}
		}, {
			passive: false
		});

		img.addEventListener('touchend', e => {
			e.preventDefault();
			if (t.isPinching && e.touches.length < 2) {
				t.isPinching = false;
				t.pinchCooldownUntil = Date.now() + 450;
			} else {
				t.isPinching = false;
			}
			if (t.scale < 1) {
				t.scale = 1;
				t.originX = 0;
				t.originY = 0;
				MessengerImageViewer.#runTransformTransition(img, true);
				MessengerImageViewer.#applyTransform(img);
			}
			if (e.touches.length === 0) t.isDragging = false;
		}, {
			passive: false
		});
	}

	static #resetTouch() {
		const t = MessengerImageViewer.#touch;
		t.scale = 1;
		t.lastScale = 1;
		t.originX = 0;
		t.originY = 0;
		t.lastOriginX = 0;
		t.lastOriginY = 0;
		t.startDist = 0;
		t.startMidX = 0;
		t.startMidY = 0;
		t.dragStartX = 0;
		t.dragStartY = 0;
		t.isDragging = false;
		t.isPinching = false;
		t.didMove = false;
		t.lastTap = 0;
		t.pinchCooldownUntil = 0;
	}

	static closeFromPopstate() {
		if (!MessengerImageViewer.#overlay) return false;
		MessengerImageViewer.close(false);
		return true;
	}

	static #collectGallery(msgArea) {
		if (!msgArea) return [];
		const urls = [];
		msgArea.querySelectorAll('.mc-msg-row[data-msg-id] .mc-bubble-image').forEach((img) => {
			const url = img.dataset.viewerUrl || img.src;
			if (url && !urls.includes(url)) urls.push(url);
		});
		return urls;
	}

	static openForChat({ src, displaySrc = null, icons, cache = null, msgArea = null } = {}) {
		const gallery = MessengerImageViewer.#collectGallery(msgArea);
		const primary = src || displaySrc;
		if (primary && !gallery.includes(primary)) gallery.unshift(primary);
		let index = gallery.indexOf(primary);
		if (index < 0 && displaySrc) index = gallery.indexOf(displaySrc);
		if (index < 0) index = 0;
		const displaySrcByUrl = {};
		if (displaySrc && primary) displaySrcByUrl[primary] = displaySrc;
		MessengerImageViewer.open(gallery[index] || primary, icons, cache, {
			gallery,
			index,
			displaySrcByUrl,
		});
	}

	static open(src, icons, cache = null, options = {}) {
		MessengerImageViewer.close(false);
		MessengerImageViewer.#resetTouch();
		MessengerImageViewer.#swipeStart = null;

		const gallery = options.gallery?.length ? options.gallery.slice() : [src];
		let index = typeof options.index === 'number' ? options.index : gallery.indexOf(src);
		if (index < 0) index = 0;
		MessengerImageViewer.#gallery = gallery;
		MessengerImageViewer.#galleryIndex = index;
		MessengerImageViewer.#displaySrcMap = options.displaySrcByUrl || null;
		MessengerImageViewer.#cacheRef = cache;
		MessengerImageViewer.#iconsRef = icons;

		const overlay = document.createElement('div');
		overlay.className = 'mc-img-viewer';

		const backdrop = document.createElement('div');
		backdrop.className = 'mc-img-viewer-backdrop';

		const closeBtn = document.createElement('button');
		closeBtn.type = 'button';
		closeBtn.className = 'mc-img-viewer-close';
		closeBtn.innerHTML = icons.closeBig();

		const img = document.createElement('img');
		img.className = 'mc-img-viewer-img mc-img-viewer-img--pan';

		overlay.classList.add('mc-img-viewer-overlay--pan');
		overlay.append(backdrop, closeBtn, img);
		document.body.appendChild(overlay);
		MessengerImageViewer.#overlay = overlay;
		requestAnimationFrame(() => overlay.classList.add('mc-img-viewer--visible'));

		MessengerImageViewer.#loadSlide(img, index);

		const t = MessengerImageViewer.#touch;

		closeBtn.addEventListener('click', (e) => {
			e.stopPropagation();
			MessengerImageViewer.requestClose();
		});
		backdrop.addEventListener('click', (e) => {
			e.stopPropagation();
			if (!t.didMove) MessengerImageViewer.requestClose();
		});

		MessengerImageViewer.#keyHandler = (e) => {
			if (e.key === 'Escape') MessengerImageViewer.requestClose();
			else if (e.key === 'ArrowLeft') MessengerImageViewer.#showRelative(-1, img);
			else if (e.key === 'ArrowRight') MessengerImageViewer.#showRelative(1, img);
		};
		document.addEventListener('keydown', MessengerImageViewer.#keyHandler);

		history.pushState({ mcImgViewer: true }, '');
		MessengerImageViewer.#historyPushed = true;
		MessengerImageViewer.#popHandler = () => {
			if (!MessengerImageViewer.#overlay) return;
			MessengerImageViewer.close(false);
			messengerConsumePopstate();
		};
		window.addEventListener('popstate', MessengerImageViewer.#popHandler);

		MessengerImageViewer.#setupTouchZoom(img, overlay);
		MessengerImageViewer.#setupSwipeNavigation(overlay, img);
	}

	static #loadSlide(img, index) {
		const gallery = MessengerImageViewer.#gallery;
		if (!gallery.length) return;
		const i = ((index % gallery.length) + gallery.length) % gallery.length;
		MessengerImageViewer.#galleryIndex = i;
		const url = gallery[i];
		const displayOverride = MessengerImageViewer.#displaySrcMap?.[url];
		if (displayOverride) {
			img.src = displayOverride;
		}
		if (displayOverride && displayOverride === url) return;
		const cache = MessengerImageViewer.#cacheRef;
		if (cache) {
			cache.fetchAndCacheImage(url)
				.then(objUrl => { if (img.isConnected) img.src = objUrl; })
				.catch(() => { if (img.isConnected) img.src = url; });
		} else {
			img.src = url;
		}
	}

	static #showRelative(delta, img) {
		if (MessengerImageViewer.#gallery.length < 2) return;
		const outClass = delta > 0 ? 'mc-img-viewer-img--exit-left' : 'mc-img-viewer-img--exit-right';
		const inClass = delta > 0 ? 'mc-img-viewer-img--enter-right' : 'mc-img-viewer-img--enter-left';
		img.classList.add('mc-img-viewer-img--gallery-anim', outClass);
		window.setTimeout(() => {
			if (!img.isConnected) return;
			MessengerImageViewer.#loadSlide(img, MessengerImageViewer.#galleryIndex + delta);
			MessengerImageViewer.#resetTouch();
			img.style.transform = '';
			img.classList.remove(outClass);
			img.classList.add(inClass);
			requestAnimationFrame(() => {
				img.classList.remove('mc-img-viewer-img--gallery-anim', inClass);
			});
		}, 140);
	}

	static #setupSwipeNavigation(overlay, img) {
		const t = MessengerImageViewer.#touch;
		overlay.addEventListener('touchstart', (e) => {
			if (e.touches.length !== 1 || t.scale > 1.05) return;
			MessengerImageViewer.#swipeStart = {
				x: e.touches[0].clientX,
				y: e.touches[0].clientY,
			};
		}, { passive: true });

		overlay.addEventListener('touchend', (e) => {
			const start = MessengerImageViewer.#swipeStart;
			MessengerImageViewer.#swipeStart = null;
			if (!start || e.changedTouches.length !== 1) return;
			if (t.isPinching || t.scale > 1.05 || Date.now() < t.pinchCooldownUntil) return;
			const dx = e.changedTouches[0].clientX - start.x;
			const dy = e.changedTouches[0].clientY - start.y;
			if (Math.abs(dy) > 56 && Math.abs(dy) > Math.abs(dx) * 1.2) {
				MessengerImageViewer.requestClose();
				return;
			}
			if (Math.abs(dx) > 56 && Math.abs(dx) > Math.abs(dy) * 1.2) {
				MessengerImageViewer.#showRelative(dx < 0 ? 1 : -1, img);
			}
		}, { passive: true });
	}

	static requestClose() {
		if (!MessengerImageViewer.#overlay) return;
		if (MessengerImageViewer.#historyPushed && history.state?.mcImgViewer) {
			try { history.back(); return; } catch (_) {}
		}
		MessengerImageViewer.close(false);
	}

	static closeIfOpen(popHistory = true) {
		if (!MessengerImageViewer.#overlay) return false;
		if (popHistory) MessengerImageViewer.requestClose();
		else MessengerImageViewer.close(false);
		return true;
	}

	static close(popHistory = true) {
		const overlay = MessengerImageViewer.#overlay;
		MessengerImageViewer.#overlay = null;
		MessengerImageViewer.#gallery = [];
		MessengerImageViewer.#galleryIndex = 0;
		MessengerImageViewer.#displaySrcMap = null;
		MessengerImageViewer.#swipeStart = null;
		if (overlay) {
			overlay.classList.remove('mc-img-viewer--visible');
			overlay.remove();
		}
		document.querySelectorAll('.mc-img-viewer').forEach(el => el.remove());
		if (MessengerImageViewer.#keyHandler) {
			document.removeEventListener('keydown', MessengerImageViewer.#keyHandler);
			MessengerImageViewer.#keyHandler = null;
		}
		if (MessengerImageViewer.#popHandler) {
			window.removeEventListener('popstate', MessengerImageViewer.#popHandler);
			MessengerImageViewer.#popHandler = null;
		}
		if (popHistory && MessengerImageViewer.#historyPushed) {
			MessengerImageViewer.#historyPushed = false;
			if (history.state?.mcImgViewer) {
				try { history.back(); } catch (_) {}
			}
		} else {
			MessengerImageViewer.#historyPushed = false;
		}
	}
}

class MessengerUtils {
	#i18n;
	constructor(i18n) {
		this.#i18n = i18n;
	}
	mk(tag, cls = '') {
		const el = document.createElement(tag);
		if (cls) el.className = cls.trim();
		return el;
	}
	static setHidden(el, hidden) {
		if (el) el.hidden = !!hidden;
	}
	static setStatusTone(el, ok) {
		if (!el) return;
		el.classList.toggle('mapp-profile-status-msg--ok', !!ok);
		el.classList.toggle('mapp-profile-status-msg--err', !ok);
		el.classList.toggle('mapp-profile-status-text--ok', !!ok);
		el.classList.toggle('mapp-profile-status-text--err', !ok);
	}
	static setAvatarSize(el, size) {
		if (el) el.style.setProperty('--mc-avatar-size', `${size}px`);
	}
	guid() {
		return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
			const r = Math.random() * 16 | 0;
			return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
		});
	}
	initials(name) {
		const p = (name || '?').trim().split(/\s+/);
		return p.length >= 2 ? (p[0][0] + p[1][0]).toUpperCase() : (name || '?').slice(0, 2).toUpperCase();
	}
	avatarColor(id) {
		const palette = [
			'#5b8dd9', '#57a87a', '#c47fb0', '#d4875e', '#7b7fd4',
			'#5baab0', '#c4a44a', '#8a6db5', '#6aab8e', '#c46b6b',
			'#6b8fc4', '#a89060', '#5b9ea6', '#b07850', '#7a9e5b',
		];
		let hash = 0;
		const s = id || 'x';
		for (let i = 0; i < s.length; i++) hash = (hash * 31 + s.charCodeAt(i)) >>> 0;
		return palette[hash % palette.length];
	}
	formatTime(ts) {
		const d = ts instanceof Date ? ts : new Date(ts);
		return d.toLocaleTimeString(this.#i18n.locale + '-' + this.#i18n.locale.toUpperCase(), {
			hour: '2-digit',
			minute: '2-digit',
		});
	}
	formatListTime(ts) {
		const d = ts instanceof Date ? ts : new Date(ts);
		const now = new Date();
		const loc = this.#i18n.locale + '-' + this.#i18n.locale.toUpperCase();
		if (d.toDateString() === now.toDateString())
			return d.toLocaleTimeString(loc, {
				hour: '2-digit',
				minute: '2-digit'
			});
		const yesterday = new Date(now);
		yesterday.setDate(now.getDate() - 1);
		if (d.toDateString() === yesterday.toDateString()) return this.#i18n.t('yesterday');
		return d.toLocaleDateString(loc, {
			day: '2-digit',
			month: '2-digit'
		});
	}
	formatLastSeenHeader(ts) {
		const d = ts instanceof Date ? ts : new Date(ts);
		if (Number.isNaN(d.getTime())) return this.#i18n.t('lastSeenNever');
		const now = new Date();
		const diffMs = now.getTime() - d.getTime();
		if (diffMs < 0) return this.formatTime(d);
		const diffMin = Math.floor(diffMs / 60000);
		if (diffMin < 1) return this.#i18n.t('lastSeenJustNow');
		if (diffMin < 60) return this.#i18n.t('lastSeenMinutesAgo', diffMin);
		const diffHours = Math.floor(diffMin / 60);
		if (diffHours === 1) return this.#i18n.t('lastSeenHourAgo');
		if (diffHours === 2) return this.#i18n.t('lastSeenTwoHoursAgo');
		const loc = this.#i18n.locale + '-' + this.#i18n.locale.toUpperCase();
		if (d.toDateString() === now.toDateString()) return this.formatTime(d);
		const yesterday = new Date(now);
		yesterday.setDate(now.getDate() - 1);
		if (d.toDateString() === yesterday.toDateString()) return this.#i18n.t('yesterday');
		return d.toLocaleString(loc, {
			day: '2-digit',
			month: '2-digit',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit',
		});
	}
	static getDirectChatHeaderSub(chat, presence, i18n, utils, live = true) {
		if (!chat || chat.type !== 'direct' || !live) return null;
		const p = presence || 'offline';
		if (p === 'online' || p === 'idle') {
			const status = (chat.contactStatusText || '').trim();
			if (status) return status;
			return i18n.t(p === 'idle' ? 'idleNow' : 'onlineNow');
		}
		if (chat.contactLastSeenAt) return utils.formatLastSeenHeader(chat.contactLastSeenAt);
		return null;
	}
	static scrollToBottom(container) {
		container.scrollTop = container.scrollHeight;
		const MAX_WAIT_MS = 5000;
		const SETTLE_MS = 150;
		let settleTimer = null;
		let watchdogTimer = null;
		let lastHeight = container.scrollHeight;
		const cleanup = () => {
			clearTimeout(settleTimer);
			clearTimeout(watchdogTimer);
			ro.disconnect();
		};
		const doScroll = () => {
			cleanup();
			container.scrollTop = container.scrollHeight;
		};
		const ro = new ResizeObserver(() => {
			const h = container.scrollHeight;
			if (h !== lastHeight) {
				lastHeight = h;
				container.scrollTop = container.scrollHeight;
				clearTimeout(settleTimer);
				settleTimer = setTimeout(doScroll, SETTLE_MS);
			}
		});
		ro.observe(container);
		watchdogTimer = setTimeout(doScroll, MAX_WAIT_MS);
		settleTimer = setTimeout(doScroll, SETTLE_MS);
		return cleanup;
	}
	static isMobile() {
		return window.innerWidth <= 680;
	}
	static #messagePinThresholdPx = 120;
	static shouldPinMessagesToComposer(msgArea, scopeEl) {
		if (!msgArea) return false;
		const fromBottom = msgArea.scrollHeight - msgArea.scrollTop - msgArea.clientHeight;
		if (fromBottom <= MessengerUtils.#messagePinThresholdPx) return true;
		const active = document.activeElement;
		if (!active || !scopeEl?.contains(active)) return false;
		return active.classList?.contains('mc-input-field') ?? false;
	}
	static resolveChatPanel(scopeEl) {
		if (!scopeEl) return null;
		if (scopeEl.classList?.contains('mapp-chat-panel') || scopeEl.classList?.contains('mc-root')) {
			return scopeEl;
		}
		return scopeEl.querySelector('.mapp-chat-panel, .mc-root');
	}
	static pinMessagesToComposer(scopeEl) {
		const panel = MessengerUtils.resolveChatPanel(scopeEl);
		if (!panel) return null;
		const msgArea = panel.querySelector('.mc-messages');
		if (!MessengerUtils.shouldPinMessagesToComposer(msgArea, panel)) return null;
		return MessengerUtils.scrollToBottom(msgArea);
	}
	static initMobileKeyboardLayout(targetEl, options = {}) {
		if (!window.visualViewport || !targetEl) return null;
		const mode = options.mode === 'height' ? 'height' : 'inset';
		const shouldApply = typeof options.shouldApply === 'function'
			? options.shouldApply
			: () => true;
		const clearStyles = () => {
			targetEl.style.bottom = '';
			targetEl.style.height = '';
			targetEl.style.maxHeight = '';
			targetEl.style.minHeight = '';
		};
		const apply = () => {
			if (!shouldApply()) {
				clearStyles();
				return;
			}
			const vv = window.visualViewport;
			const topOffset = Math.max(0, vv.offsetTop || 0);
			const kbInset = Math.max(0, window.innerHeight - vv.height - topOffset);
			if (mode === 'inset') {
				targetEl.style.bottom = kbInset + 'px';
				targetEl.style.height = '';
				targetEl.style.maxHeight = '';
				targetEl.style.minHeight = '';
			} else {
				const layoutHeight = topOffset + vv.height;
				targetEl.style.bottom = '';
				targetEl.style.height = layoutHeight + 'px';
				targetEl.style.maxHeight = layoutHeight + 'px';
				targetEl.style.minHeight = '0';
			}
			// iOS при фокусе в поле ввода прокручивает страницу — шапка «уезжает» вверх.
			window.scrollTo(0, 0);
			MessengerUtils.#schedulePinMessagesToComposer(targetEl);
		};
		const resizeObserver = new ResizeObserver(() => {
			if (!shouldApply()) return;
			MessengerUtils.pinMessagesToComposer(targetEl);
		});
		resizeObserver.observe(targetEl);
		const panel = MessengerUtils.resolveChatPanel(targetEl);
		const msgWrap = panel?.querySelector('.mc-messages-wrap');
		if (msgWrap) resizeObserver.observe(msgWrap);
		window.visualViewport.addEventListener('resize', apply);
		window.visualViewport.addEventListener('scroll', apply);
		apply();
		const destroy = () => {
			window.visualViewport.removeEventListener('resize', apply);
			window.visualViewport.removeEventListener('scroll', apply);
			resizeObserver.disconnect();
			clearStyles();
		};
		destroy.apply = apply;
		return destroy;
	}
	static #schedulePinMessagesToComposer(scopeEl) {
		const pin = () => MessengerUtils.pinMessagesToComposer(scopeEl);
		requestAnimationFrame(() => {
			pin();
			requestAnimationFrame(pin);
		});
	}

	static findPageStart(all, endIdx, pageSize) {
		let realCount = 0;
		let i = endIdx - 1;
		for (; i >= 0; i--) {
			if (!all[i].isVirtual) {
				realCount++;
				if (realCount >= pageSize) break;
			}
		}
		let startIdx = Math.max(0, i);
		while (startIdx > 0 && all[startIdx - 1].isVirtual) startIdx--;
		return startIdx;
	}

	/** Порядок как на сервере: CreatedOn, затем id (GUID). */
	static messageTimestampMs(msg) {
		const t = msg?.timestamp;
		if (t instanceof Date) return t.getTime();
		if (typeof t === 'number') return t;
		return new Date(t).getTime();
	}

	static messageOrderId(msg) {
		return String(msg?.serverId || msg?.id || '');
	}

	static compareMessages(a, b) {
		const ta = MessengerUtils.messageTimestampMs(a);
		const tb = MessengerUtils.messageTimestampMs(b);
		if (ta !== tb) return ta - tb;
		const idA = MessengerUtils.messageOrderId(a);
		const idB = MessengerUtils.messageOrderId(b);
		if (idA === idB) return 0;
		return idA < idB ? -1 : 1;
	}

	static sortMessages(messages) {
		return [...messages].sort(MessengerUtils.compareMessages);
	}

	static isLocalMessageId(id) {
		return typeof id === 'string' && id.startsWith('local_');
	}

	/** Убирает дубли (local_* + серверный id / serverId) после сбоев синхронизации. */
	static dedupeMessages(messages) {
		const sorted = MessengerUtils.sortMessages(messages);
		const seenServer = new Set();
		const seenId = new Set();
		const out = [];
		for (let i = sorted.length - 1; i >= 0; i--) {
			const m = sorted[i];
			if (m.isVirtual) {
				out.unshift(m);
				continue;
			}
			const serverKey = m.serverId || (!MessengerUtils.isLocalMessageId(m.id) ? m.id : null);
			if (serverKey) {
				if (seenServer.has(serverKey)) continue;
				seenServer.add(serverKey);
			}
			if (seenId.has(m.id)) continue;
			seenId.add(m.id);
			out.unshift(m);
		}
		const canonicalIds = new Set(
			out.filter(m => !m.isVirtual && !MessengerUtils.isLocalMessageId(m.id)).map(m => m.id)
		);
		return out.filter(m =>
			m.isVirtual ||
			!MessengerUtils.isLocalMessageId(m.id) ||
			!m.serverId ||
			!canonicalIds.has(m.serverId)
		);
	}

	static collectDomMessageRows(msgArea, topLoader) {
		return [...msgArea.children].filter(
			el => el.dataset.msgId && !el.dataset.dateSep && el !== topLoader
		);
	}

	static getExpectedVisibleMessageIds(all, cacheTopIdx) {
		return all.slice(cacheTopIdx)
			.filter(m => !m.isVirtual && !m.deletedForEveryone)
			.map(m => m.id);
	}

	static findFirstOrderMismatch(renderedIds, expectedIds) {
		const minLen = Math.min(renderedIds.length, expectedIds.length);
		for (let i = 0; i < minLen; i++) {
			if (renderedIds[i] !== expectedIds[i]) return i;
		}
		if (expectedIds.length !== renderedIds.length) return minLen;
		return -1;
	}

	/**
	 * Переставляет уже отрисованные строки в порядке expectedIds; пропуски возвращает в missingIds.
	 */
	static reconcileMessageDomOrder({
		msgArea,
		topLoader,
		expectedIds,
		all,
		onUpdateData,
	}) {
		const rows = MessengerUtils.collectDomMessageRows(msgArea, topLoader);
		const renderedIds = rows.map(el => el.dataset.msgId);
		const mismatchIdx = MessengerUtils.findFirstOrderMismatch(renderedIds, expectedIds);
		if (mismatchIdx === -1) {
			const missingIds = expectedIds.slice(renderedIds.length);
			return { reordered: false, missingIds };
		}
		const idToEl = new Map(rows.map(el => [el.dataset.msgId, el]));
		let insertBefore = mismatchIdx > 0
			? idToEl.get(expectedIds[mismatchIdx - 1])?.nextSibling
			: topLoader.nextSibling;
		const missingIds = [];
		for (let i = mismatchIdx; i < expectedIds.length; i++) {
			const id = expectedIds[i];
			const el = idToEl.get(id);
			if (!el) {
				missingIds.push(id);
				continue;
			}
			const fresh = all.find(m => m.id === id);
			if (fresh && onUpdateData) onUpdateData(id, fresh, el);
			if (el !== insertBefore) msgArea.insertBefore(el, insertBefore);
			insertBefore = el.nextSibling;
		}
		return { reordered: true, missingIds, mismatchIdx };
	}
}

class MessengerCache {
	static DB_NAME = 'MessengerCacheDB';
	static DB_VERSION = 6;
	static CACHE_LOCAL_VERSION = 1;
	static CACHE_PLAIN_VERSION = 2;
	static STORE_MESSAGES = 'messages';
	static STORE_META = 'chatMeta';
	static STORE_IMAGES = 'images';
	static STORE_THUMBNAILS = 'thumbnails';
	#db = null;
	#objectURLs = new Map();
	#thumbURLs = new Map();
	#ready = null;
	#cryptoGetter = () => null;

	setCryptoGetter(getter) {
		this.#cryptoGetter = typeof getter === 'function' ? getter : () => null;
	}

	#crypto() {
		return this.#cryptoGetter?.() || null;
	}

	static #messageRecordFromMsg(chatId, msg) {
		const ts = msg.timestamp instanceof Date
			? msg.timestamp.getTime()
			: new Date(msg.timestamp).getTime();
		const editedTs = msg.editedOn instanceof Date
			? msg.editedOn.getTime()
			: (msg.editedOn ? new Date(msg.editedOn).getTime() : null);
		const tier = (msg.encryptionTier || 'basic').toLowerCase();
		let text = msg.text ?? '';
		let replyToTextPreview = msg.replyToTextPreview ?? null;
		let encText = msg._encText || null;
		let encReply = msg._encReplyPreview ?? null;
		if (tier === 'protected') {
			if (!encText && SupraCrypto.isEncrypted(text)) encText = text;
			if (encReply == null && replyToTextPreview && SupraCrypto.isEncrypted(replyToTextPreview)) {
				encReply = replyToTextPreview;
			}
		}
		return {
			chatId,
			id: msg.id,
			serverId: msg.serverId ?? null,
			senderId: msg.senderId ?? null,
			senderName: msg.senderName ?? null,
			senderAvatar: msg.senderAvatar ?? null,
			text,
			timestamp: ts,
			status: msg.status ?? 'read',
			isOwn: !!msg.isOwn,
			isVirtual: !!msg.isVirtual,
			contentType: msg.contentType ?? null,
			replyToMessageId: msg.replyToMessageId ?? null,
			replyToSenderName: msg.replyToSenderName ?? null,
			replyToTextPreview,
			forwardedFromSenderName: msg.forwardedFromSenderName ?? null,
			editedOn: editedTs,
			deletedForEveryone: !!msg.deletedForEveryone,
			encryptionTier: msg.encryptionTier || 'basic',
			_encText: encText,
			_encReplyPreview: encReply,
			bodyEnc: null,
			_lc: 0,
		};
	}

	async #sealRecord(record) {
		const tier = (record.encryptionTier || 'basic').toLowerCase();
		if (tier === 'protected') {
			const encText = record._encText
				|| (SupraCrypto.isEncrypted(record.text) ? record.text : null);
			if (!encText) {
				console.warn('[MessengerCache] protected message missing ciphertext', record.id);
				return null;
			}
			let encReply = record._encReplyPreview ?? null;
			if (encReply == null && record.replyToTextPreview && SupraCrypto.isEncrypted(record.replyToTextPreview)) {
				encReply = record.replyToTextPreview;
			}
			return {
				...record,
				text: encText,
				replyToTextPreview: encReply,
				bodyEnc: null,
				_lc: MessengerCache.CACHE_PLAIN_VERSION,
			};
		}
		return {
			...record,
			text: record.text ?? '',
			replyToTextPreview: record.replyToTextPreview ?? null,
			_encText: null,
			_encReplyPreview: null,
			bodyEnc: null,
			_lc: MessengerCache.CACHE_PLAIN_VERSION,
		};
	}

	async #openRecord(record) {
		if (record._lc === MessengerCache.CACHE_LOCAL_VERSION && record.bodyEnc) {
			const crypto = this.#crypto();
			if (!crypto?.isUnlocked) {
				return { ...record, text: '', replyToTextPreview: null };
			}
			try {
				const raw = await crypto.decryptLocal(record.bodyEnc);
				const p = JSON.parse(raw);
				return {
					...record,
					text: p.t ?? '',
					replyToTextPreview: p.r ?? null,
					_lc: MessengerCache.CACHE_PLAIN_VERSION,
					bodyEnc: null,
				};
			} catch (_) {
				return { ...record, text: '', replyToTextPreview: null };
			}
		}
		return record;
	}

	static #recordToUiMessage(r) {
		const tier = (r.encryptionTier || 'basic').toLowerCase();
		const msg = {
			id: r.id,
			serverId: r.serverId ?? null,
			chatId: r.chatId,
			senderId: r.senderId,
			senderName: r.senderName,
			senderAvatar: r.senderAvatar,
			text: r.text,
			timestamp: new Date(r.timestamp),
			status: r.status,
			isOwn: r.isOwn,
			isVirtual: r.isVirtual || false,
			contentType: r.contentType || null,
			replyToMessageId: r.replyToMessageId ?? null,
			replyToSenderName: r.replyToSenderName ?? null,
			replyToTextPreview: r.replyToTextPreview ?? null,
			forwardedFromSenderName: r.forwardedFromSenderName ?? null,
			editedOn: r.editedOn ? new Date(r.editedOn) : null,
			deletedForEveryone: !!r.deletedForEveryone,
			encryptionTier: r.encryptionTier || 'basic',
		};
		if (tier === 'protected') {
			if (SupraCrypto.isEncrypted(r.text)) msg._encText = r.text;
			if (r.replyToTextPreview && SupraCrypto.isEncrypted(r.replyToTextPreview)) {
				msg._encReplyPreview = r.replyToTextPreview;
			}
		}
		return msg;
	}
	open() {
		if (this.#ready) return this.#ready;
		this.#ready = new Promise((resolve, reject) => {
			const req = indexedDB.open(MessengerCache.DB_NAME, MessengerCache.DB_VERSION);
			req.onupgradeneeded = (e) => {
				const db = e.target.result;
				if (e.oldVersion < 6 && db.objectStoreNames.contains(MessengerCache.STORE_MESSAGES)) {
					db.deleteObjectStore(MessengerCache.STORE_MESSAGES);
				}
				if (!db.objectStoreNames.contains(MessengerCache.STORE_MESSAGES)) {
					const store = db.createObjectStore(MessengerCache.STORE_MESSAGES, {
						keyPath: ['chatId', 'id']
					});
					store.createIndex('byChatTs', ['chatId', 'timestamp'], { unique: false });
				}
				if (!db.objectStoreNames.contains(MessengerCache.STORE_META))
					db.createObjectStore(MessengerCache.STORE_META, { keyPath: 'chatId' });
				if (!db.objectStoreNames.contains(MessengerCache.STORE_IMAGES))
					db.createObjectStore(MessengerCache.STORE_IMAGES, { keyPath: 'url' });
				if (!db.objectStoreNames.contains(MessengerCache.STORE_THUMBNAILS))
					db.createObjectStore(MessengerCache.STORE_THUMBNAILS, { keyPath: 'url' });
			};
			req.onsuccess = (e) => {
				this.#db = e.target.result;
				resolve(this.#db);
			};
			req.onerror = (e) => reject(e.target.error);
		});
		return this.#ready;
	}
	async #getDB() {
		if (this.#db) return this.#db;
		return this.open();
	}
	async saveMessages(chatId, messages) {
		if (!messages?.length) return;
		try {
			const sealedPairs = await Promise.all(
				messages.map(async (msg) => {
					const record = await this.#sealRecord(
						MessengerCache.#messageRecordFromMsg(chatId, msg)
					);
					return record ? { msg, record } : null;
				})
			);
			const valid = sealedPairs.filter(Boolean);
			if (!valid.length) return;
			const db = await this.#getDB();
			await new Promise((resolve, reject) => {
				const tx = db.transaction([MessengerCache.STORE_MESSAGES, MessengerCache.STORE_META], 'readwrite');
				const msgStore = tx.objectStore(MessengerCache.STORE_MESSAGES);
				const metaSt = tx.objectStore(MessengerCache.STORE_META);
				let latestMsg = null;
				for (const { msg, record } of valid) {
					msgStore.put(record);
					if (!msg.isVirtual) {
						const ts = record.timestamp;
						const candidate = { id: msg.id, timestamp: new Date(ts) };
						if (!latestMsg || MessengerUtils.compareMessages(candidate, latestMsg) > 0)
							latestMsg = candidate;
					}
				}
				if (latestMsg !== null) {
					const latestTs = MessengerUtils.messageTimestampMs(latestMsg);
					const metaReq = metaSt.get(chatId);
					metaReq.onsuccess = (e) => {
						const existing = e.target.result;
						if (!existing || latestTs > (existing.lastTs ?? 0))
							metaSt.put({ chatId, lastId: latestMsg.id, lastTs: latestTs });
					};
				}
				tx.oncomplete = () => resolve();
				tx.onerror = (e) => reject(e.target.error);
			});
		} catch (err) {
			console.warn('[MessengerCache] saveMessages error:', err);
		}
	}
	async getMessages(chatId) {
		try {
			const db = await this.#getDB();
			return await new Promise((resolve, reject) => {
				const tx = db.transaction(MessengerCache.STORE_MESSAGES, 'readonly');
				const index = tx.objectStore(MessengerCache.STORE_MESSAGES).index('byChatTs');
				const range = IDBKeyRange.bound([chatId, 0], [chatId, Infinity]);
				const req = index.getAll(range);
				req.onsuccess = async (e) => {
					try {
						const opened = await Promise.all(
							e.target.result.map((r) => this.#openRecord(r))
						);
						const rows = opened.map((r) => MessengerCache.#recordToUiMessage(r));
						resolve(MessengerUtils.dedupeMessages(rows));
					} catch (err) {
						reject(err);
					}
				};
				req.onerror = (e) => reject(e.target.error);
			});
		} catch (err) {
			console.warn('[MessengerCache] getMessages error:', err);
			return [];
		}
	}
	async hasRecord(chatId, id) {
		try {
			const db = await this.#getDB();
			return await new Promise((resolve, reject) => {
				const tx = db.transaction(MessengerCache.STORE_MESSAGES, 'readonly');
				const req = tx.objectStore(MessengerCache.STORE_MESSAGES).getKey([chatId, id]);
				req.onsuccess = (e) => resolve(e.target.result !== undefined);
				req.onerror = (e) => reject(e.target.error);
			});
		} catch {
			return false;
		}
	}
	async getChatMeta(chatId) {
		try {
			const db = await this.#getDB();
			return await new Promise((resolve, reject) => {
				const tx = db.transaction(MessengerCache.STORE_META, 'readonly');
				const req = tx.objectStore(MessengerCache.STORE_META).get(chatId);
				req.onsuccess = (e) => resolve(e.target.result ?? null);
				req.onerror = (e) => reject(e.target.error);
			});
		} catch {
			return null;
		}
	}
	async getLastMessageId(chatId) {
		const meta = await this.getChatMeta(chatId);
		return meta?.lastId ?? null;
	}
	async updateMessageServerId(chatId, localId, serverId) {
		try {
			const db = await this.#getDB();
			await new Promise((resolve, reject) => {
				const tx = db.transaction(MessengerCache.STORE_MESSAGES, 'readwrite');
				const store = tx.objectStore(MessengerCache.STORE_MESSAGES);
				const req = store.get([chatId, localId]);
				req.onsuccess = (e) => {
					const record = e.target.result;
					if (!record) return;
					record.serverId = serverId;
					store.put(record);
				};
				tx.oncomplete = () => resolve();
				tx.onerror = (e) => reject(e.target.error);
			});
		} catch (err) {
			console.warn('[MessengerCache] updateMessageServerId error:', err);
		}
	}
	async purgeMessageAliases(chatId, serverId, localId) {
		try {
			const db = await this.#getDB();
			await new Promise((resolve, reject) => {
				const tx = db.transaction(MessengerCache.STORE_MESSAGES, 'readwrite');
				const store = tx.objectStore(MessengerCache.STORE_MESSAGES);
				const req = store.openCursor();
				req.onsuccess = (e) => {
					const cursor = e.target.result;
					if (!cursor) return;
					const rec = cursor.value;
					if (rec.chatId === chatId) {
						const dropLocal = localId && rec.id === localId;
						const dropServer = serverId &&
							(rec.id === serverId || rec.serverId === serverId);
						if (dropLocal || dropServer) cursor.delete();
					}
					cursor.continue();
				};
				tx.oncomplete = () => resolve();
				tx.onerror = (e) => reject(e.target.error);
			});
		} catch (err) {
			console.warn('[MessengerCache] purgeMessageAliases error:', err);
		}
	}
	async deleteMessage(chatId, messageId) {
		try {
			const db = await this.#getDB();
			await new Promise((resolve, reject) => {
				const tx = db.transaction(
					[MessengerCache.STORE_MESSAGES, MessengerCache.STORE_META],
					'readwrite'
				);
				const msgStore = tx.objectStore(MessengerCache.STORE_MESSAGES);
				const metaStore = tx.objectStore(MessengerCache.STORE_META);
				const getReq = msgStore.get([chatId, messageId]);
				getReq.onsuccess = () => {
					msgStore.delete([chatId, messageId]);
					const metaReq = metaStore.get(chatId);
					metaReq.onsuccess = (e) => {
						const meta = e.target.result;
						if (!meta || meta.lastId !== messageId) return;
						const index = msgStore.index('byChatTs');
						const range = IDBKeyRange.bound([chatId, 0], [chatId, Infinity]);
						const cursorReq = index.openCursor(range, 'prev');
						let updated = false;
						cursorReq.onsuccess = (ev) => {
							const cursor = ev.target.result;
							if (!cursor) {
								if (!updated) metaStore.delete(chatId);
								return;
							}
							const rec = cursor.value;
							if (rec.id === messageId || rec.isVirtual) {
								cursor.continue();
								return;
							}
							updated = true;
							metaStore.put({ chatId, lastId: rec.id, lastTs: rec.timestamp });
						};
					};
				};
				tx.oncomplete = () => resolve();
				tx.onerror = (e) => reject(e.target.error);
			});
			const ou = this.#objectURLs.get(messageId);
			if (ou) {
				URL.revokeObjectURL(ou);
				this.#objectURLs.delete(messageId);
			}
		} catch (err) {
			console.warn('[MessengerCache] deleteMessage error:', err);
		}
	}
	async clearChat(chatId) {
		try {
			const db = await this.#getDB();
			await new Promise((resolve, reject) => {
				const tx = db.transaction([MessengerCache.STORE_MESSAGES, MessengerCache.STORE_META], 'readwrite');
				const msgStore = tx.objectStore(MessengerCache.STORE_MESSAGES);
				const index = msgStore.index('byChatTs');
				const range = IDBKeyRange.bound([chatId, 0], [chatId, Infinity]);
				index.openKeyCursor(range).onsuccess = (e) => {
					const cursor = e.target.result;
					if (cursor) {
						msgStore.delete(cursor.primaryKey);
						cursor.continue();
					}
				};
				tx.objectStore(MessengerCache.STORE_META).delete(chatId);
				tx.oncomplete = () => resolve();
				tx.onerror = (e) => reject(e.target.error);
			});
		} catch (err) {
			console.warn('[MessengerCache] clearChat error:', err);
		}
	}
	async clearMessages() {
		try {
			const db = await this.#getDB();
			await new Promise((resolve, reject) => {
				const tx = db.transaction(
					[MessengerCache.STORE_MESSAGES, MessengerCache.STORE_META],
					'readwrite'
				);
				tx.objectStore(MessengerCache.STORE_MESSAGES).clear();
				tx.objectStore(MessengerCache.STORE_META).clear();
				tx.oncomplete = () => resolve();
				tx.onerror = (e) => reject(e.target.error);
			});
		} catch (err) {
			console.warn('[MessengerCache] clearMessages error:', err);
		}
	}
	async getPendingMessages() {
		try {
			const db = await this.#getDB();
			return await new Promise((resolve, reject) => {
				const tx = db.transaction(MessengerCache.STORE_MESSAGES, 'readonly');
				const store = tx.objectStore(MessengerCache.STORE_MESSAGES);
				const grouped = new Map();
				const req = store.openCursor();
				req.onsuccess = (e) => {
					const cursor = e.target.result;
					if (!cursor) {
						(async () => {
							const result = [];
							for (const [chatId, messages] of grouped) {
								const opened = await Promise.all(
									messages.map((r) => this.#openRecord(r))
								);
								result.push({
									chatId,
									messages: opened.map((r) => MessengerCache.#recordToUiMessage(r)),
								});
							}
							resolve(result);
						})().catch(reject);
						return;
					}
					const rec = cursor.value;
					if (rec.status === 'sending') {
						if (!grouped.has(rec.chatId)) grouped.set(rec.chatId, []);
						grouped.get(rec.chatId).push(rec);
					}
					cursor.continue();
				};
				req.onerror = (e) => reject(e.target.error);
			});
		} catch (err) {
			console.warn('[MessengerCache] getPendingMessages error:', err);
			return [];
		}
	}
	async updateMessageStatus(chatId, messageId, status) {
		try {
			const db = await this.#getDB();
			await new Promise((resolve, reject) => {
				const tx = db.transaction(MessengerCache.STORE_MESSAGES, 'readwrite');
				const store = tx.objectStore(MessengerCache.STORE_MESSAGES);
				const req = store.get([chatId, messageId]);
				req.onsuccess = (e) => {
					const record = e.target.result;
					if (!record) return;
					record.status = status;
					store.put(record);
				};
				tx.oncomplete = () => resolve();
				tx.onerror = (e) => reject(e.target.error);
			});
		} catch (err) {
			console.warn('[MessengerCache] updateMessageStatus error:', err);
		}
	}
	static async #createThumbnailBlob(blob, maxSize = 400) {
		return new Promise((resolve) => {
			const img = new Image();
			const objUrl = URL.createObjectURL(blob);
			img.onload = () => {
				URL.revokeObjectURL(objUrl);
				let w = img.naturalWidth, h = img.naturalHeight;
				if (w === 0 || h === 0) { resolve(null); return; }
				if (w > maxSize || h > maxSize) {
					if (w >= h) { h = Math.round(h * maxSize / w); w = maxSize; }
					else { w = Math.round(w * maxSize / h); h = maxSize; }
				}
				const canvas = document.createElement('canvas');
				canvas.width = w; canvas.height = h;
				canvas.getContext('2d').drawImage(img, 0, 0, w, h);
				canvas.toBlob(b => resolve(b), 'image/jpeg', 0.82);
			};
			img.onerror = () => { URL.revokeObjectURL(objUrl); resolve(null); };
			img.src = objUrl;
		});
	}
	async getThumbnail(url) {
		if (this.#thumbURLs.has(url)) return this.#thumbURLs.get(url);
		try {
			const db = await this.#getDB();
			const record = await new Promise((resolve, reject) => {
				const tx = db.transaction(MessengerCache.STORE_THUMBNAILS, 'readonly');
				const req = tx.objectStore(MessengerCache.STORE_THUMBNAILS).get(url);
				req.onsuccess = (e) => resolve(e.target.result ?? null);
				req.onerror = (e) => reject(e.target.error);
			});
			if (!record?.blob) return null;
			const objectURL = URL.createObjectURL(record.blob);
			this.#thumbURLs.set(url, objectURL);
			return objectURL;
		} catch { return null; }
	}
	async #saveThumbnail(url, blob) {
		try {
			const db = await this.#getDB();
			await new Promise((resolve, reject) => {
				const tx = db.transaction(MessengerCache.STORE_THUMBNAILS, 'readwrite');
				tx.objectStore(MessengerCache.STORE_THUMBNAILS).put({ url, blob });
				tx.oncomplete = () => resolve();
				tx.onerror = (e) => reject(e.target.error);
			});
		} catch (err) { console.warn('[MessengerCache] saveThumbnail error:', err); }
	}
	async getOrCreateThumbnail(url, signal = null) {
		const cached = await this.getThumbnail(url);
		if (cached) return cached;
		let blob;
		const cachedFull = await this.getImage(url);
		if (cachedFull) {
			blob = await (await fetch(cachedFull)).blob();
		} else {
			const response = await fetch(url, { credentials: 'same-origin', signal });
			if (!response.ok) throw new Error(`HTTP ${response.status}`);
			blob = await response.blob();
			try {
				const db = await this.#getDB();
				await new Promise((resolve, reject) => {
					const tx = db.transaction(MessengerCache.STORE_IMAGES, 'readwrite');
					tx.objectStore(MessengerCache.STORE_IMAGES).put({ url, blob });
					tx.oncomplete = () => resolve();
					tx.onerror = (e) => reject(e.target.error);
				});
			} catch {}
			this.#objectURLs.set(url, URL.createObjectURL(blob));
		}
		const thumbBlob = await MessengerCache.#createThumbnailBlob(blob);
		if (!thumbBlob) return this.#objectURLs.get(url) ?? url;
		await this.#saveThumbnail(url, thumbBlob);
		const thumbURL = URL.createObjectURL(thumbBlob);
		this.#thumbURLs.set(url, thumbURL);
		return thumbURL;
	}
	applyThumbnailSrc(imgEl, url, signal = null) {
		if (this.#thumbURLs.has(url)) { imgEl.src = this.#thumbURLs.get(url); return; }
		this.getOrCreateThumbnail(url, signal)
			.then(u => { if (imgEl.isConnected) imgEl.src = u; })
			.catch(err => { if (err?.name !== 'AbortError' && imgEl.isConnected) imgEl.src = url; });
	}
	async getImage(url) {
		if (this.#objectURLs.has(url)) return this.#objectURLs.get(url);
		try {
			const db = await this.#getDB();
			const record = await new Promise((resolve, reject) => {
				const tx = db.transaction(MessengerCache.STORE_IMAGES, 'readonly');
				const req = tx.objectStore(MessengerCache.STORE_IMAGES).get(url);
				req.onsuccess = (e) => resolve(e.target.result ?? null);
				req.onerror = (e) => reject(e.target.error);
			});
			if (!record?.blob) return null;
			const objectURL = URL.createObjectURL(record.blob);
			this.#objectURLs.set(url, objectURL);
			return objectURL;
		} catch { return null; }
	}
	async fetchAndCacheImage(url, signal = null) {
		const cached = await this.getImage(url);
		if (cached) return cached;
		const response = await fetch(url, { credentials: 'same-origin', signal });
		if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`);
		const blob = await response.blob();
		try {
			const db = await this.#getDB();
			await new Promise((resolve, reject) => {
				const tx = db.transaction(MessengerCache.STORE_IMAGES, 'readwrite');
				tx.objectStore(MessengerCache.STORE_IMAGES).put({ url, blob });
				tx.oncomplete = () => resolve();
				tx.onerror = (e) => reject(e.target.error);
			});
		} catch {}
		const objectURL = URL.createObjectURL(blob);
		this.#objectURLs.set(url, objectURL);
		return objectURL;
	}
	applyImageSrc(imgEl, url, signal = null) {
		if (this.#objectURLs.has(url)) { imgEl.src = this.#objectURLs.get(url); return; }
		this.fetchAndCacheImage(url, signal)
			.then(u => { if (imgEl.isConnected) imgEl.src = u; })
			.catch(err => { if (err?.name !== 'AbortError' && imgEl.isConnected) imgEl.src = url; });
	}
	async removeImage(url) {
		const ou = this.#objectURLs.get(url);
		if (ou) { URL.revokeObjectURL(ou); this.#objectURLs.delete(url); }
		const tu = this.#thumbURLs.get(url);
		if (tu) { URL.revokeObjectURL(tu); this.#thumbURLs.delete(url); }
		try {
			const db = await this.#getDB();
			await new Promise((resolve, reject) => {
				const tx = db.transaction([MessengerCache.STORE_IMAGES, MessengerCache.STORE_THUMBNAILS], 'readwrite');
				tx.objectStore(MessengerCache.STORE_IMAGES).delete(url);
				tx.objectStore(MessengerCache.STORE_THUMBNAILS).delete(url);
				tx.oncomplete = () => resolve();
				tx.onerror = (e) => reject(e.target.error);
			});
		} catch {}
	}
	async clearAll() {
		this.#objectURLs.forEach(u => URL.revokeObjectURL(u));
		this.#objectURLs.clear();
		this.#thumbURLs.forEach(u => URL.revokeObjectURL(u));
		this.#thumbURLs.clear();
		try {
			const db = await this.#getDB();
			await new Promise((resolve, reject) => {
				const tx = db.transaction(
					[MessengerCache.STORE_MESSAGES, MessengerCache.STORE_META,
					 MessengerCache.STORE_IMAGES, MessengerCache.STORE_THUMBNAILS],
					'readwrite'
				);
				[MessengerCache.STORE_MESSAGES, MessengerCache.STORE_META,
				 MessengerCache.STORE_IMAGES, MessengerCache.STORE_THUMBNAILS]
					.forEach(s => tx.objectStore(s).clear());
				tx.oncomplete = () => resolve();
				tx.onerror = (e) => reject(e.target.error);
			});
		} catch (err) { console.warn('[MessengerCache] clearAll error:', err); }
	}
	destroy() {
		this.#objectURLs.forEach(u => URL.revokeObjectURL(u));
		this.#objectURLs.clear();
		this.#thumbURLs.forEach(u => URL.revokeObjectURL(u));
		this.#thumbURLs.clear();
		this.#db?.close();
		this.#db = null;
		this.#ready = null;
	}
}

class MessengerMessageService {
	#cache;
	#knownSeparators = new Map();
	constructor(cache) {
		this.#cache = cache;
	}

	getCachedMessages(chatId) {
		return this.#cache.getMessages(chatId);
	}

	#dayString(date) {
		const d = date instanceof Date ? date : new Date(date);
		return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
	}
	async #getKnownDays(chatId) {
		if (this.#knownSeparators.has(chatId)) return this.#knownSeparators.get(chatId);
		const all = await this.#cache.getMessages(chatId);
		const days = new Set(
			all
				.filter(m => m.isVirtual && m.contentType === MessengerCustomMessage.CONTENT_TYPES.DATE_SEPARATOR)
				.map(m => this.#dayString(m.timestamp))
		);
		this.#knownSeparators.set(chatId, days);
		return days;
	}
	async #buildMissingSeparators(chatId, messages) {
		const knownDays = await this.#getKnownDays(chatId);
		const newSeps = [];
		for (const msg of messages) {
			if (msg.isVirtual) continue;
			const ts = msg.timestamp instanceof Date ? msg.timestamp : new Date(msg.timestamp);
			const day = this.#dayString(ts);
			if (!knownDays.has(day)) {
				knownDays.add(day);
				newSeps.push(MessengerCustomMessage.createSeparatorRecord(ts));
			}
		}
		return newSeps;
	}
	async ingest(chatId, messages, api = null) {
		if (!messages?.length) return { saved: [], separatorsAdded: [] };
		let toIngest = messages;
		if (api?.prepareMessagesForCache) {
			toIngest = await api.prepareMessagesForCache(chatId, messages);
		}
		const separatorsAdded = await this.#buildMissingSeparators(chatId, toIngest);
		const toSave = [...separatorsAdded, ...toIngest];
		await this.#cache.saveMessages(chatId, toSave);
		return { saved: toIngest, separatorsAdded };
	}
	async ingestOne(chatId, msg, api = null) {
		const { separatorsAdded } = await this.ingest(chatId, [msg], api);
		return { msg, separatorAdded: separatorsAdded[0] ?? null };
	}
	async confirmOptimistic(chatId, localId, serverMsg) {
		try {
			await this.#cache.purgeMessageAliases(chatId, serverMsg?.id, localId);
		} catch (err) {
			console.warn('[MessengerMessageService] confirmOptimistic purge error:', err);
		}
		await this.#cache.saveMessages(chatId, [serverMsg]);
		return serverMsg;
	}
	async loadFromCache(chatId, limit = 0, offset = 0) {
		const all = await this.#cache.getMessages(chatId);
		if (!all.length) return [];
		if (limit <= 0) return all;
		const end = all.length - offset;
		const start = Math.max(0, end - limit);
		return all.slice(start, end);
	}
	async syncNewMessages(chatId, api, pageSize = 50) {
		const lastId = await this.#cache.getLastMessageId(chatId);
		let newMsgs = [];
		try {
			newMsgs = await api.getNewMessages(chatId, lastId, pageSize);
		} catch (err) {
			console.warn('[MessengerMessageService] syncNewMessages error:', err);
			return { messages: [], reconcile: { historyCleared: false, removedIds: [] } };
		}
		if (newMsgs.length) await this.ingest(chatId, newMsgs, api);
		const reconcile = await this.reconcileWithServerIndex(chatId, api, lastId);
		return { messages: newMsgs, reconcile: reconcile || { historyCleared: false, removedIds: [] } };
	}
	async initialLoad(chatId, api, pageSize = 20) {
		const cached = await this.#cache.getMessages(chatId);
		if (cached.length) return cached;
		const lastId = await this.#cache.getLastMessageId(chatId);
		const newMsgs = await api.getNewMessages(chatId, lastId, pageSize);
		if (newMsgs.length) await this.ingest(chatId, newMsgs, api);
		return this.getDisplayMessages(chatId, api);
	}
	async #reconcileTimestampsFromIndex(chatId, indexEntries) {
		if (!indexEntries?.length) return;
		const cached = await this.#cache.getMessages(chatId);
		const byId = new Map(cached.filter(m => !m.isVirtual).map(m => [m.id, m]));
		const patches = [];
		for (const entry of indexEntries) {
			const local = byId.get(entry.id);
			if (!local) continue;
			const serverTs = MessengerUtils.messageTimestampMs({ timestamp: entry.timestamp });
			const localTs = MessengerUtils.messageTimestampMs(local);
			if (serverTs !== localTs) {
				local.timestamp = entry.timestamp instanceof Date
					? entry.timestamp
					: new Date(entry.timestamp);
				patches.push(local);
			}
		}
		if (patches.length) await this.#cache.saveMessages(chatId, patches);
	}

	async #fetchMissingAfter(chatId, api, afterId, missingIds, pageSize = 50) {
		const need = new Set(missingIds);
		if (!need.size) return;
		let cursor = afterId;
		for (let guard = 0; guard < 20 && need.size; guard++) {
			const batch = await api.getNewMessages(chatId, cursor, pageSize);
			if (!batch.length) break;
			await this.ingest(chatId, batch, api);
			for (const m of batch) need.delete(m.id);
			cursor = batch[batch.length - 1].id;
		}
	}

	async reconcileWithServerIndex(chatId, api, afterMessageId = null) {
		try {
			const fullIndex = await api.getMessageSyncIndex(chatId, null);
			const serverIds = new Set((fullIndex || []).map(e => e.id));

			if (!fullIndex?.length) {
				const cached = await this.#cache.getMessages(chatId);
				if (cached.some(m => !m.isVirtual)) {
					await this.#cache.clearChat(chatId);
					this.#knownSeparators.delete(chatId);
					return { historyCleared: true, removedIds: [] };
				}
				return { historyCleared: false, removedIds: [] };
			}

			await this.#reconcileTimestampsFromIndex(chatId, fullIndex);

			const cached = await this.#cache.getMessages(chatId);
			const removedIds = [];
			for (const m of cached) {
				if (m.isVirtual || serverIds.has(m.id)) continue;
				await this.#cache.deleteMessage(chatId, m.id);
				removedIds.push(m.id);
			}
			if (removedIds.length) this.#knownSeparators.delete(chatId);

			const index = afterMessageId
				? await api.getMessageSyncIndex(chatId, afterMessageId)
				: fullIndex;
			if (!index?.length) return { historyCleared: false, removedIds };

			const cachedAfterPurge = await this.#cache.getMessages(chatId);
			const cachedIds = new Set(cachedAfterPurge.filter(m => !m.isVirtual).map(m => m.id));
			const missing = index.map(e => e.id).filter(id => !cachedIds.has(id));
			if (missing.length) {
				const anchor = afterMessageId || await this.#cache.getLastMessageId(chatId);
				await this.#fetchMissingAfter(chatId, api, anchor, missing);
			}
			return { historyCleared: false, removedIds };
		} catch (err) {
			console.warn('[MessengerMessageService] reconcileWithServerIndex error:', err);
			return { historyCleared: false, removedIds: [] };
		}
	}

	async resolveQuoteAnchor(chatId, messageId, api, radius = 25) {
		const all = await this.getDisplayMessages(chatId, api);
		const idx = all.findIndex(m => m.id === messageId && !m.isVirtual);
		if (idx >= 0) {
			const realCount = all.filter(m => !m.isVirtual).length;
			const realBefore = all.slice(0, idx).filter(m => !m.isVirtual).length;
			return {
				all,
				idx,
				hasMoreBefore: realBefore > 0,
				hasMoreAfter: realBefore < realCount - 1,
			};
		}
		const around = await api.getMessagesAround(chatId, messageId, radius, radius);
		if (around.messages?.length) await this.ingest(chatId, around.messages, api);
		const merged = await this.getDisplayMessages(chatId, api);
		const mergedIdx = merged.findIndex(m => m.id === messageId && !m.isVirtual);
		return {
			all: merged,
			idx: mergedIdx,
			hasMoreBefore: around.hasMoreBefore,
			hasMoreAfter: around.hasMoreAfter,
		};
	}

	async refreshRecentFromServer(chatId, api, pageSize = 50) {
		const result = await this.syncRecentFromServer(chatId, api, pageSize);
		return result.all;
	}

	async syncRecentFromServer(chatId, api, pageSize = 50) {
		let reconcile = { historyCleared: false, removedIds: [] };
		try {
			const batch = await api.getMessages(chatId, 0, pageSize);
			if (batch.length) await this.ingest(chatId, batch, api);
			const sync = await this.syncNewMessages(chatId, api, pageSize);
			reconcile = sync.reconcile || reconcile;
		} catch (err) {
			console.warn('[MessengerMessageService] syncRecentFromServer error:', err);
		}
		return {
			all: await this.getDisplayMessages(chatId, api),
			historyCleared: !!reconcile.historyCleared,
			removedIds: reconcile.removedIds || [],
		};
	}

	async getDisplayMessages(chatId, api) {
		const raw = await this.#cache.getMessages(chatId);
		if (!api?.mapCachedMessages) return raw;
		return api.mapCachedMessages(chatId, raw);
	}

	async syncChatAfterOffline(chatId, api) {
		const { messages, reconcile } = await this.syncNewMessages(chatId, api, 50);
		return { messages, reconcile };
	}
	async updateMessageServerId(chatId, localId, serverId) {
		await this.#cache.updateMessageServerId(chatId, localId, serverId);
	}
	async syncMessageStatus(chatId, messageId, status) {
		await this.#cache.updateMessageStatus(chatId, messageId, status);
		const messages = await this.#cache.getMessages(chatId);
		const byServerId = messages.find(m => m.serverId === messageId);
		if (byServerId) {
			await this.#cache.updateMessageStatus(chatId, byServerId.id, status);
		}
	}
	async #resolveStoredRecord(chatId, incomingId) {
		const messages = await this.#cache.getMessages(chatId);
		const direct = messages.find(m => m.id === incomingId);
		if (direct) return { storedId: direct.id, record: direct };
		const byServerId = messages.find(m => m.serverId === incomingId);
		if (byServerId) return { storedId: byServerId.id, record: byServerId };
		return null;
	}
	async deleteMessage(chatId, messageId, messageType) {
		try {
			const resolved = await this.#resolveStoredRecord(chatId, messageId);
			if (!resolved) {
				console.warn('[MessengerMessageService] deleteMessage: запись не найдена', { chatId, messageId });
				return { storedId: null, originalId: messageId };
			}
			const { storedId, record } = resolved;
			let imageUrl = null;
			if (messageType === 'image') {
				const parsed = MessengerCustomMessage.parse(record.text);
				if (parsed) imageUrl = parsed.url ?? parsed.fileId ?? null;
			}
			await this.#cache.deleteMessage(chatId, storedId);
			if (messageType === 'image' && imageUrl) await this.#cache.removeImage(imageUrl);
			this.#knownSeparators.delete(chatId);
			return { storedId, originalId: messageId };
		} catch (err) {
			console.warn('[MessengerMessageService] deleteMessage error:', err);
			return { storedId: null, originalId: messageId };
		}
	}
	async reconcileOnStartup(api, onResolved, ageThresholdMs = 10000) {
		const report = { total: 0, confirmed: 0, failed: 0, skipped: 0 };
		try {
			const pendingGroups = await this.#cache.getPendingMessages();
			const now = Date.now();
			const eligibleGroups = [];
			for (const group of pendingGroups) {
				const eligible = [];
				for (const msg of group.messages) {
					const age = now - (msg.timestamp instanceof Date ? msg.timestamp.getTime() : msg.timestamp);
					if (age < ageThresholdMs) { report.skipped++; } else { eligible.push(msg); }
				}
				report.total += group.messages.length;
				if (eligible.length > 0) eligibleGroups.push({ chatId: group.chatId, messages: eligible });
			}
			for (const group of eligibleGroups) {
				const { chatId, messages } = group;
				let serverMessages = [];
				try {
					serverMessages = await api.getNewMessages(chatId, null, MessengerApiClient.RECONCILE_COUNT);
				} catch (err) {
					console.warn(`[MessengerMessageService] reconcileOnStartup: getNewMessages failed`, err);
					for (const localMsg of messages) {
						await this.#cache.updateMessageStatus(chatId, localMsg.id, 'error');
						report.failed++;
						onResolved({ chatId, localId: localMsg.id, outcome: 'failed' });
					}
					continue;
				}
				const serverByText = new Map();
				for (const sMsg of serverMessages) {
					const key = (sMsg.text ?? '').trim();
					if (!serverByText.has(key)) serverByText.set(key, sMsg);
				}
				for (const localMsg of messages) {
					const key = (localMsg.text ?? '').trim();
					if (serverByText.has(key)) {
						const serverMsg = serverByText.get(key);
						serverByText.delete(key);
						serverMsg.status = serverMsg.status || 'sent';
						await this.confirmOptimistic(chatId, localMsg.id, serverMsg);
						report.confirmed++;
						onResolved({ chatId, localId: localMsg.id, outcome: 'confirmed', serverMsg });
					} else {
						await this.#cache.updateMessageStatus(chatId, localMsg.id, 'error');
						report.failed++;
						onResolved({ chatId, localId: localMsg.id, outcome: 'failed' });
					}
				}
			}
		} catch (err) {
			console.warn('[MessengerMessageService] reconcileOnStartup error:', err);
		}
		return report;
	}
	async resetAll() {
		await this.#cache.clearMessages();
		this.#knownSeparators.clear();
	}
	resetChat(chatId) {
		this.#knownSeparators.delete(chatId);
	}
	destroy() {
		this.#knownSeparators.clear();
	}
}

class MessengerSidebar {
	#utils;
	#icons;
	#avatarBuilder;
	#i18n;
	#presence = null;
	#onUserClick = null;
	#onChatAction = null;
	#onFolderSelect = null;
	#connectionStateMgr = null;
	#onNetworkReconnect = null;
	#currentUser = null;
	#folders = [];
	#folderMembers = [];
	#archiveFolderId = null;
	#allChatsRef = [];
	#activeFolderId = null;
	#searchMode = null; // { chat } or null
	#allChats = [];
	#lastActiveChat = null;
	#lastI18n = null;
	#folderSwipeLock = false;
	#folderSlideNeighbor = null;
	#folderSlideTargetId = null;
	#folderSlideMode = null;
	#folderSlideWidth = 0;
	#folderSlideX = 0;
	static MIN_SEARCH_LEN = 4;
	static FOLDER_SWIPE_MAX_WIDTH = 1199;
	static FOLDER_SWIPE_MIN_PX = 56;
	static FOLDER_SWIPE_COMMIT_RATIO = 0.28;

	el = {};

	static #LOGO_CLICK_MAX_GAP_MS = 1000;

	#compileLogoClickRunner(scriptSource) {
		const src = (scriptSource || '').trim();
		if (!src) return null;
		try {
			return new Function('clickCount', 'showNotice', src);
		} catch (e) {
			console.warn('[Messenger] Logo click script compile error:', e);
			return null;
		}
	}

	#bindLogoClickEasterEgg(logoEl, scriptSource) {
		const runner = this.#compileLogoClickRunner(scriptSource);
		if (!runner) return;
		logoEl.classList.add('mapp-app-logo--clickable');
		let lastClickAt = 0;
		let burstCount = 0;
		const showNotice = (message, buttonLabel, onButtonClick) =>
			MessengerDialog.showNotice(message, buttonLabel, onButtonClick, this.#themeManager);
		logoEl.addEventListener('click', (e) => {
			e.stopPropagation();
			const now = Date.now();
			if (lastClickAt && now - lastClickAt > MessengerSidebar.#LOGO_CLICK_MAX_GAP_MS) {
				burstCount = 1;
			} else {
				burstCount += 1;
			}
			lastClickAt = now;
			try {
				runner(burstCount, showNotice);
			} catch (err) {
				console.warn('[Messenger] Logo click script error:', err);
			}
		});
	}

	constructor(utils, icons, avatarBuilder, i18n) {
		this.#utils = utils;
		this.#icons = icons;
		this.#avatarBuilder = avatarBuilder;
		this.#i18n = i18n;
	}

	setOnUserClick(fn) { this.#onUserClick = fn; }
	setOnChatAction(fn) { this.#onChatAction = fn; }
	setOnFolderSelect(fn) { this.#onFolderSelect = fn; }
	setPresenceManager(presence) { this.#presence = presence; }

	setConnectionStateManager(mgr) {
		this.#connectionStateMgr = mgr;
		mgr?.subscribe((state, error) => {
			this.#updateNetworkIndicator(state, error);
			if (this.#allChatsRef?.length) {
				this.renderChatList(this.#allChatsRef, this.#lastActiveChat, this.#lastI18n || this.#i18n);
			}
		});
	}

	#canShowContactPresence() {
		return this.#connectionStateMgr?.state === MessengerConnectionStateManager.STATE_CONNECTED;
	}

	setOnNetworkReconnect(fn) { this.#onNetworkReconnect = fn; }

	render(onNewChat, onChatSelect) {
		const sidebar = this.#utils.mk('div', 'mapp-sidebar');
		const topBar = this.#utils.mk('div', 'mapp-sidebar-topbar');

		const branding = typeof window !== 'undefined' ? window.__appBranding : null;
		if (branding?.logoUrl) {
			const logo = isThemedSvgLogo(branding)
				? createThemedSvgLogoEl(branding.logoUrl, branding.appName || '')
				: (() => {
					const img = this.#utils.mk('img', 'mapp-app-logo');
					img.src = branding.logoUrl;
					img.alt = branding.appName || '';
					return img;
				})();
			this.#bindLogoClickEasterEgg(logo, branding.logoClickScript);
			topBar.append(logo);
			if (!isThemedSvgLogo(branding)) {
				upgradeLogoToThemedSvgIfNeeded(logo, branding, (themed) => {
					this.#bindLogoClickEasterEgg(themed, branding.logoClickScript);
				});
			}
		}

		const userInfo = this.#utils.mk('div', 'mapp-sidebar-user');
		userInfo.title = this.#i18n.t('profile');
		bindTapAction(userInfo, () => {
			if (typeof this.#onUserClick === 'function') this.#onUserClick();
		});

		const userAvatarWrap = this.#utils.mk('div', 'mapp-sidebar-avatar-wrap');
		const userTextWrap = this.#utils.mk('div', 'mapp-sidebar-user-text');
		const userNameEl = this.#utils.mk('span', 'mapp-sidebar-username');
		userNameEl.textContent = '…';
		const userStatusEl = this.#utils.mk('span', 'mapp-sidebar-user-status');
		userTextWrap.append(userNameEl, userStatusEl);
		userInfo.append(userAvatarWrap, userTextWrap);

		const newChatBtn = this.#utils.mk('button', 'mapp-new-chat-btn');
		newChatBtn.innerHTML = this.#icons.pencil();
		newChatBtn.title = this.#i18n.t('newChat');
		newChatBtn.addEventListener('click', () => {
			if (this.#searchMode) this.#exitSearch();
			onNewChat();
		});

		const searchToggleBtn = this.#utils.mk('button', 'mapp-search-toggle-btn');
		searchToggleBtn.innerHTML = this.#icons.search();
		searchToggleBtn.title = this.#i18n.t('searchChats');
		searchToggleBtn.type = 'button';

		const searchWrap = this.#utils.mk('div', 'mapp-search-wrap mapp-search-wrap--collapsed');
		const searchInput = this.#utils.mk('input', 'mapp-search-input');
		searchInput.placeholder = this.#i18n.t('searchChats');
		const searchClearBtn = this.#utils.mk('button', 'mapp-search-clear-btn');
		searchClearBtn.innerHTML = this.#icons.close();
		searchClearBtn.hidden = true;
		searchClearBtn.title = this.#i18n.t('cancel');
		searchClearBtn.addEventListener('click', () => {
			if (this.#searchMode) {
				this.#exitSearch();
			} else {
				searchInput.value = '';
				searchClearBtn.hidden = true;
				searchInput.placeholder = this.#i18n.t('searchChats');
				this.el._filterQuery = '';
				this.el._onFilter && this.el._onFilter('');
				this.#collapseSearch();
			}
		});
		searchWrap.append(searchInput, searchClearBtn);

		searchToggleBtn.addEventListener('click', () => {
			const collapsed = searchRow.classList.toggle('mapp-search-row--collapsed');
			searchWrap.classList.toggle('mapp-search-wrap--collapsed', collapsed);
			if (!collapsed) {
				searchInput.focus();
			} else {
				searchInput.value = '';
				searchClearBtn.hidden = true;
				this.el._filterQuery = '';
				this.el._onFilter && this.el._onFilter('');
			}
		});

		const topBarActions = this.#utils.mk('div', 'mapp-sidebar-topbar-actions');
		topBarActions.append(searchToggleBtn, newChatBtn);
		topBar.append(userInfo, topBarActions);

		const searchRow = this.#utils.mk('div', 'mapp-search-row mapp-search-row--collapsed');
		searchRow.append(searchWrap);

		const foldersBar = this.#utils.mk('div', 'mapp-folders-bar');
		foldersBar.hidden = true;
		foldersBar.addEventListener('wheel', e => {
			if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
				foldersBar.scrollLeft += e.deltaY;
				e.preventDefault();
			}
		}, { passive: false });

		const chatListViewport = this.#utils.mk('div', 'mapp-chat-list-viewport');
		const chatListTrack = this.#utils.mk('div', 'mapp-chat-list-track');
		const chatListPanel = this.#utils.mk('div', 'mapp-chat-list-panel');
		chatListTrack.appendChild(chatListPanel);
		chatListViewport.appendChild(chatListTrack);
		Object.assign(this.el, {
			sidebar,
			chatList: chatListViewport,
			chatListTrack,
			chatListPanel,
			searchInput,
			searchClearBtn,
			searchWrap,
			searchToggleBtn,
			searchRow,
			foldersBar,
			userAvatarWrap,
			userNameEl,
			userStatusEl,
		});

		searchInput.addEventListener('input', () => {
			const q = searchInput.value.trim();
			searchClearBtn.hidden = !(q || this.#searchMode);
			const qLower = q.toLowerCase();
			this.el._filterQuery = qLower.length >= MessengerSidebar.MIN_SEARCH_LEN ? qLower : '';
			this.el._onFilter && this.el._onFilter(this.el._filterQuery);
		});

		// Wrap non-folder elements in main column
		const sidebarMain = this.#utils.mk('div', 'mapp-sidebar-main');
		sidebarMain.append(topBar, searchRow, foldersBar, chatListViewport);
		sidebar.appendChild(sidebarMain);
		Object.assign(this.el, { sidebarMain });
		this.el._onChatSelect = onChatSelect;
		this.#bindFolderSwipe();
		return sidebar;
	}

	setOnFilter(fn) {
		this.el._onFilter = fn;
	}

	updateUser(user) {
		if (!user) return;
		this.#currentUser = user;
		this.el.userNameEl.textContent = user.name;
		this.#renderUserStatus();
		this.#renderUserAvatar();
	}

	#renderUserStatus() {
		const el = this.el.userStatusEl;
		if (!el) return;
		const status = (this.#currentUser?.statusText || '').trim();
		el.textContent = status;
	}

	setUserStatus(statusText) {
		if (this.#currentUser) this.#currentUser.statusText = statusText || '';
		this.#renderUserStatus();
	}

	#renderUserAvatar() {
		const wrap = this.el.userAvatarWrap;
		const user = this.#currentUser;
		if (!wrap || !user) return;

		wrap.innerHTML = '';
		const avatarWrap = this.#utils.mk('div', 'mc-avatar-wrap');
		MessengerUtils.setAvatarSize(avatarWrap, 34);
		avatarWrap.appendChild(
			this.#avatarBuilder.build(user.colorSeed || 'me', user.name, user.avatar || null, 34)
		);

		const dot = this.#utils.mk('span', 'mapp-network-dot');
		bindTapAction(dot, () => {
			if (this.#connectionStateMgr?.state === 'offline') {
				this.#onNetworkReconnect?.();
				this.#showNetworkErrorTip(dot);
			}
		}, { stopPropagation: true });
		avatarWrap.appendChild(dot);
		wrap.appendChild(avatarWrap);
		this.el.userNetworkDot = dot;

		this.#applyNetworkIndicator(
			dot,
			this.#connectionStateMgr?.state ?? 'connecting',
			this.#connectionStateMgr?.error ?? ''
		);
	}

	#applyNetworkIndicator(dot, state, error) {
		if (!dot) return;
		dot.className = 'mapp-network-dot';
		if (state === 'connected') {
			dot.classList.add('mapp-network-dot--connected');
			dot.removeAttribute('title');
		} else if (state === 'offline') {
			dot.classList.add('mapp-network-dot--offline');
			const msg = error || this.#i18n.t('networkOfflineMsg');
			dot.title = msg;
			dot.dataset.errorMsg = msg;
		} else {
			dot.classList.add('mapp-network-dot--connecting');
			dot.removeAttribute('title');
			delete dot.dataset.errorMsg;
		}
	}

	#updateNetworkIndicator(state, error) {
		if (this.el.userNetworkDot) {
			this.#applyNetworkIndicator(this.el.userNetworkDot, state, error);
			return;
		}
		if (this.#currentUser) this.#renderUserAvatar();
	}

	#showNetworkErrorTip(anchorEl) {
		document.querySelectorAll('.mapp-network-error-tip').forEach(el => el.remove());
		const msg = anchorEl?.dataset.errorMsg || this.#i18n.t('networkOfflineMsg');
		const tip = this.#utils.mk('div', 'mapp-network-error-tip');
		tip.textContent = msg;
		anchorEl.appendChild(tip);
		const dismiss = (e) => {
			if (tip.contains(e.target) || e.target === anchorEl) return;
			tip.remove();
			document.removeEventListener('click', dismiss, true);
		};
		setTimeout(() => document.addEventListener('click', dismiss, true), 0);
		setTimeout(() => tip.remove(), 6000);
	}

	setFolders(folders, members) {
		this.#folders = (folders || []).filter(f => !f.isArchive);
		this.#archiveFolderId = (folders || []).find(f => f.isArchive)?.id || null;
		this.#folderMembers = members || [];
		this.#renderFoldersBar();
	}

	getArchiveFolderId() { return this.#archiveFolderId; }

	isChatInFolder(chatId, folderId) {
		if (!chatId || !folderId) return false;
		return this.#folderMembers.some(m => m.chatId === chatId && m.folderId === folderId);
	}

	getActiveFolderId() {
		return this.#activeFolderId;
	}

	isKnownFolderId(folderId) {
		if (folderId === null || folderId === undefined) return true;
		if (this.#archiveFolderId && folderId === this.#archiveFolderId) return true;
		return this.#folders.some(f => f.id === folderId);
	}

	selectFolder(folderId, options = {}) {
		return this.#selectFolder(folderId, options);
	}

	openArchiveFolder() {
		if (!this.#archiveFolderId) return;
		this.#selectFolder(this.#archiveFolderId, { instant: true });
	}

	#isFolderSwipeLayout() {
		return window.innerWidth <= MessengerSidebar.FOLDER_SWIPE_MAX_WIDTH;
	}

	// Swipe/tab order: «Все чаты» → пользовательские папки (архив только из настроек).
	#folderNavIds() {
		const ids = [null];
		this.#folders.filter(f => !f.isArchive).forEach(f => ids.push(f.id));
		return ids;
	}

	#releaseOrphanFolderSwipeLock() {
		if (this.#folderSwipeLock && !this.#folderSlideMode && !this.#folderSlideNeighbor) {
			this.#folderSwipeLock = false;
		}
	}

	#selectFolder(folderId, { instant = false, fromUser = false } = {}) {
		this.#releaseOrphanFolderSwipeLock();
		if (fromUser && this.#folderSwipeLock) {
			this.#resetFolderSwipe();
		}
		const currentIdx = this.#folderIndex(this.#activeFolderId);
		const targetIdx = this.#folderIndex(folderId);
		if (targetIdx >= 0 && targetIdx === currentIdx) return;
		if (this.#folderSwipeLock) return;

		if (instant || this.#searchMode || !this.#lastI18n ||
			this.#folderNavIds().length <= 1 || targetIdx < 0 || currentIdx < 0) {
			this.#applyFolderInstant(folderId);
			return;
		}

		const direction = targetIdx > currentIdx ? 1 : -1;
		if (!this.#beginFolderSlide(folderId, direction)) {
			this.#applyFolderInstant(folderId);
			return;
		}

		// Highlight the target tab right away; renderChatList is locked out
		// while the slide runs, so the visible panel won't be rebuilt mid-animation.
		// Do not scroll the tab bar here — scrollIntoView used to shift the whole sidebar.
		this.#activeFolderId = folderId;
		this.#renderFoldersBar();
		this.#settleFolderSlide(true);
	}

	#applyFolderInstant(folderId) {
		this.#resetFolderSwipe();
		this.#activeFolderId = folderId;
		this.#renderFoldersBar();
		this.#scrollActiveFolderTabIntoView();
		if (typeof this.#onFolderSelect === 'function') this.#onFolderSelect(folderId);
	}

	// Positions both panels for the given live-panel offset (in px).
	// The live panel rides the track; the neighbor is an absolute overlay that
	// sits one screen-width away on the incoming side, so neither the track
	// width nor the surrounding layout ever changes during a slide.
	#setFolderSlideOffset(offset) {
		const track = this.el.chatListTrack;
		this.#folderSlideX = offset;
		if (track) track.style.transform = `translate3d(${offset}px, 0, 0)`;
		const neighbor = this.#folderSlideNeighbor;
		if (neighbor && this.#folderSlideMode) {
			const nOff = offset + (this.#folderSlideMode === 'next'
				? this.#folderSlideWidth
				: -this.#folderSlideWidth);
			neighbor.style.transform = `translate3d(${nOff}px, 0, 0)`;
		}
	}

	#getFolderSlideWidth() {
		return this.el.chatList?.clientWidth || window.innerWidth;
	}

	// Builds the neighbor overlay and pins both panels at the base offset
	// without any transition, ready for a finger drag or click animation.
	#beginFolderSlide(targetFolderId, direction) {
		if (!this.#lastI18n) return false;
		const track = this.el.chatListTrack;
		const viewport = this.el.chatList;
		const live = this.el.chatListPanel;
		if (!track || !viewport || !live) return false;

		const width = this.#getFolderSlideWidth();
		if (width <= 0) return false;

		// Drop any stale neighbor overlay from a previous slide.
		viewport.querySelectorAll('.mapp-chat-list-neighbor').forEach(p => p.remove());

		this.#folderSlideWidth = width;
		this.#folderSlideTargetId = targetFolderId;
		this.#folderSlideMode = direction === 1 ? 'next' : 'prev';
		this.#folderSwipeLock = true;

		const neighbor = this.#utils.mk('div', 'mapp-chat-list-panel mapp-chat-list-neighbor');
		neighbor.style.transition = 'none';
		this.#renderPanelContent(
			neighbor,
			targetFolderId,
			this.#allChatsRef,
			this.#lastActiveChat,
			this.#lastI18n
		);
		this.#folderSlideNeighbor = neighbor;
		viewport.appendChild(neighbor);

		// Disable the live track transition and place both panels at the base
		// offset (live centered, neighbor just off-screen on the incoming side).
		track.classList.add('mapp-chat-list-track--dragging');
		this.#setFolderSlideOffset(0);
		void viewport.offsetWidth; // commit base position synchronously
		return true;
	}

	// Live finger tracking: dx is movement since the gesture locked horizontal.
	#dragFolderSlide(dx) {
		if (!this.#folderSlideMode) return;
		const width = this.#folderSlideWidth;
		let offset = dx;
		if (this.#folderSlideMode === 'next') {
			if (offset > 0) offset = 0;
			if (offset < -width) offset = -width;
		} else {
			if (offset < 0) offset = 0;
			if (offset > width) offset = width;
		}
		this.#setFolderSlideOffset(offset);
	}

	// Animates both panels to their final resting place, then swaps or reverts.
	#settleFolderSlide(commit) {
		const track = this.el.chatListTrack;
		if (!track || !this.#folderSlideMode) {
			this.#resetFolderSwipe();
			return;
		}
		const width = this.#folderSlideWidth;
		const finalOffset = commit
			? (this.#folderSlideMode === 'next' ? -width : width)
			: 0;

		let finished = false;
		const finish = () => {
			if (finished) return;
			finished = true;
			track.removeEventListener('transitionend', onEnd);
			clearTimeout(fallback);
			try {
				if (commit) this.#commitFolderSlide();
				else this.#cancelFolderSlide();
			} catch (e) {
				console.warn('[MessengerSidebar] folder slide finish', e);
				this.#clearFolderSlideState();
			}
		};

		// Already at the resting position: finalize on the next frame, no animation.
		if (Math.abs(this.#folderSlideX - finalOffset) < 0.5) {
			requestAnimationFrame(finish);
			return;
		}

		// Re-enable transitions for both the live track and the neighbor overlay.
		track.classList.remove('mapp-chat-list-track--dragging');
		if (this.#folderSlideNeighbor) this.#folderSlideNeighbor.style.transition = '';

		const onEnd = (e) => {
			if (e.target !== track || e.propertyName !== 'transform') return;
			finish();
		};
		track.addEventListener('transitionend', onEnd);
		// Safety net in case transitionend doesn't fire.
		const fallback = setTimeout(finish, 360);
		requestAnimationFrame(() => this.#setFolderSlideOffset(finalOffset));
	}

	// Finalizes a committed slide: repaint the live panel with the target folder,
	// snap it back to center and drop the overlay — all with transitions disabled,
	// so the swap is invisible (no second animation, no panel shift).
	#commitFolderSlide() {
		const track = this.el.chatListTrack;
		const live = this.el.chatListPanel;
		const targetId = this.#folderSlideTargetId;
		if (!track || !live) {
			this.#cancelFolderSlide();
			return;
		}

		track.classList.add('mapp-chat-list-track--dragging');
		this.#activeFolderId = targetId;
		this.#renderPanelContent(
			live,
			targetId,
			this.#allChatsRef,
			this.#lastActiveChat,
			this.#lastI18n
		);
		this.#folderSlideMode = null; // stop offsetting the soon-removed neighbor
		this.#setFolderSlideOffset(0);
		this.#removeFolderNeighbor();
		void track.offsetWidth;
		track.classList.remove('mapp-chat-list-track--dragging');

		this.#clearFolderSlideState();
		this.#renderFoldersBar();
		this.#scrollActiveFolderTabIntoView();
		if (typeof this.#onFolderSelect === 'function') {
			this.#onFolderSelect(this.#activeFolderId);
		}
	}

	// Reverts an aborted slide: snap the live panel back to center and drop the
	// overlay without a visible animation.
	#cancelFolderSlide() {
		const track = this.el.chatListTrack;
		if (track) {
			track.classList.add('mapp-chat-list-track--dragging');
			this.#folderSlideMode = null;
			this.#setFolderSlideOffset(0);
			this.#removeFolderNeighbor();
			void track.offsetWidth;
			track.classList.remove('mapp-chat-list-track--dragging');
		} else {
			this.#removeFolderNeighbor();
		}
		this.#clearFolderSlideState();
	}

	#removeFolderNeighbor() {
		const neighbor = this.#folderSlideNeighbor;
		if (neighbor?.isConnected) neighbor.remove();
		// Safety net: drop any stray overlays left behind.
		this.el.chatList?.querySelectorAll('.mapp-chat-list-neighbor').forEach(p => p.remove());
		this.#folderSlideNeighbor = null;
	}

	#clearFolderSlideState() {
		this.#removeFolderNeighbor();
		this.#folderSlideTargetId = null;
		this.#folderSlideMode = null;
		this.#folderSlideWidth = 0;
		this.#folderSlideX = 0;
		this.#folderSwipeLock = false;
		const track = this.el.chatListTrack;
		if (track) track.style.transform = '';
	}

	// Instantly tear down any in-progress slide (no animation).
	#resetFolderSwipe() {
		if (!this.#folderSlideMode && !this.#folderSlideNeighbor) {
			this.#folderSwipeLock = false;
			return;
		}
		this.#cancelFolderSlide();
	}

	#folderIndex(folderId) {
		const ids = this.#folderNavIds();
		let idx = ids.indexOf(folderId);
		if (idx < 0 && (folderId === null || folderId === undefined)) idx = 0;
		return idx;
	}

	// Scroll only inside the folders bar — never scrollIntoView on ancestors
	// (that was shifting mapp-sidebar / mapp-chat-area on mobile).
	#scrollActiveFolderTabIntoView() {
		const bar = this.el.foldersBar;
		if (!bar || bar.hidden) return;
		const key = this.#activeFolderId ?? '';
		const tab = bar.querySelector(`[data-folder-id="${key}"]`);
		if (!tab) return;

		const root = bar.closest('.mapp-root');
		const desktopCol = root?.classList.contains('mapp-desktop') &&
			window.innerWidth >= 1200;

		if (desktopCol) {
			const pad = 4;
			const tabTop = tab.offsetTop;
			const tabBottom = tabTop + tab.offsetHeight;
			const viewTop = bar.scrollTop;
			const viewBottom = viewTop + bar.clientHeight;
			if (tabTop < viewTop) {
				bar.scrollTo({ top: Math.max(0, tabTop - pad), behavior: 'smooth' });
			} else if (tabBottom > viewBottom) {
				bar.scrollTo({
					top: tabBottom - bar.clientHeight + pad,
					behavior: 'smooth',
				});
			}
			return;
		}

		const barWidth = bar.clientWidth;
		if (barWidth <= 0) return;
		const tabLeft = tab.offsetLeft;
		const tabWidth = tab.offsetWidth;
		const maxScroll = Math.max(0, bar.scrollWidth - barWidth);
		const targetLeft = tabLeft - (barWidth - tabWidth) / 2;
		bar.scrollTo({
			left: Math.max(0, Math.min(targetLeft, maxScroll)),
			behavior: 'smooth',
		});
	}

	#navigateFolder(delta) {
		const ids = this.#folderNavIds();
		if (ids.length <= 1) return;
		const idx = this.#folderIndex(this.#activeFolderId);
		if (idx < 0) return;
		const next = idx + delta;
		if (next < 0 || next >= ids.length) return;
		this.#selectFolder(ids[next]);
	}

	#folderSwipeCommitThreshold() {
		return Math.max(
			MessengerSidebar.FOLDER_SWIPE_MIN_PX,
			this.#folderSlideWidth * MessengerSidebar.FOLDER_SWIPE_COMMIT_RATIO
		);
	}

	#folderSwipeShouldCommit(offsetPx) {
		if (!this.#folderSlideMode) return false;
		const threshold = this.#folderSwipeCommitThreshold();
		return this.#folderSlideMode === 'next'
			? offsetPx <= -threshold
			: offsetPx >= threshold;
	}

	#folderSwipeFingerDragActive(track, horizontal) {
		return horizontal || (
			!!this.#folderSlideMode &&
			!!track?.classList.contains('mapp-chat-list-track--dragging')
		);
	}

	#bindFolderSwipe() {
		const viewport = this.el.chatList;
		const track = this.el.chatListTrack;
		if (!viewport || !track || viewport.dataset.folderSwipeBound) return;
		viewport.dataset.folderSwipeBound = '1';

		let startX = 0;       // raw gesture start
		let startY = 0;
		let dragStartX = 0;   // x at the moment the gesture locked horizontal
		let lastDx = 0;
		let tracking = false; // a touch is being followed (not yet decided)
		let horizontal = false; // a horizontal slide is active
		let activeTouchId = null;

		const canStartSwipe = () => {
			if (!this.#isFolderSwipeLayout()) return false;
			if (this.#searchMode) return false;
			this.#releaseOrphanFolderSwipeLock();
			if (this.#folderSwipeLock) return false;
			if (this.#folderIndex(this.#activeFolderId) < 0) return false;
			return this.#folderNavIds().length > 1;
		};

		const fingerDragActive = () => this.#folderSwipeFingerDragActive(track, horizontal);

		const activeTouch = (e) => {
			if (activeTouchId == null) return e.touches[0] ?? null;
			for (let i = 0; i < e.touches.length; i++) {
				if (e.touches[i].identifier === activeTouchId) return e.touches[i];
			}
			return null;
		};

		const activeTouchEnded = (e) => {
			if (activeTouchId == null) return true;
			for (let i = 0; i < e.changedTouches.length; i++) {
				if (e.changedTouches[i].identifier === activeTouchId) return true;
			}
			return false;
		};

		const settleFingerDrag = () => {
			horizontal = false;
			tracking = false;
			activeTouchId = null;
			if (!this.#folderSlideMode) return;
			this.#settleFolderSlide(this.#folderSwipeShouldCommit(this.#folderSlideX));
		};

		viewport.addEventListener('touchstart', (e) => {
			if (e.touches.length !== 1 || !canStartSwipe()) {
				// A second finger or a scroll while dragging must not drop the in-progress slide.
				if (!fingerDragActive()) tracking = false;
				return;
			}
			activeTouchId = e.touches[0].identifier;
			startX = e.touches[0].clientX;
			startY = e.touches[0].clientY;
			tracking = true;
			horizontal = false;
			lastDx = 0;
		}, { passive: true });

		viewport.addEventListener('touchmove', (e) => {
			if (!tracking && !fingerDragActive()) return;
			const touch = activeTouch(e);
			if (!touch) return;
			if (!tracking && fingerDragActive()) tracking = true;

			const x = touch.clientX;
			const dx = x - startX;
			const dy = touch.clientY - startY;

			if (!horizontal) {
				// Wait until the gesture has a clear direction.
				if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
				if (Math.abs(dx) <= Math.abs(dy)) { tracking = false; return; }

				const direction = dx < 0 ? 1 : -1;
				const idx = this.#folderIndex(this.#activeFolderId);
				if (idx < 0) { tracking = false; return; }
				const ids = this.#folderNavIds();
				const nextIdx = idx + direction;
				if (nextIdx < 0 || nextIdx >= ids.length) { tracking = false; return; }
				if (!this.#beginFolderSlide(ids[nextIdx], direction)) { tracking = false; return; }

				// Start tracking the finger from here so there is no jump.
				dragStartX = x;
				horizontal = true;
			}

			e.preventDefault();
			lastDx = x - dragStartX;
			this.#dragFolderSlide(lastDx);
		}, { passive: false });

		viewport.addEventListener('touchcancel', (e) => {
			if (fingerDragActive() && (activeTouchEnded(e) || e.touches.length === 0)) {
				settleFingerDrag();
				return;
			}
			if (!fingerDragActive()) {
				tracking = false;
				horizontal = false;
				activeTouchId = null;
			}
		}, { passive: true });

		viewport.addEventListener('touchend', (e) => {
			if (fingerDragActive() && (activeTouchEnded(e) || e.touches.length === 0)) {
				settleFingerDrag();
				return;
			}
			if (!fingerDragActive()) {
				tracking = false;
				activeTouchId = null;
			}
		}, { passive: true });
	}

	#collapseSearch() {
		if (this.el.searchRow) this.el.searchRow.classList.add('mapp-search-row--collapsed');
		if (this.el.searchWrap) this.el.searchWrap.classList.add('mapp-search-wrap--collapsed');
	}

	#folderUnreadCount(folderId) {
		const chatIds = new Set(
			this.#folderMembers.filter(m => m.folderId === folderId).map(m => m.chatId)
		);
		return (this.#allChatsRef || []).reduce((sum, c) => chatIds.has(c.id) ? sum + (c.unreadCount || 0) : sum, 0);
	}

	#archivedChatIds() {
		if (!this.#archiveFolderId) return new Set();
		return new Set(
			this.#folderMembers.filter(m => m.folderId === this.#archiveFolderId).map(m => m.chatId)
		);
	}

	#renderFolderTab(folder, labelOverride) {
		const btn = this.#utils.mk('button', 'mapp-folder-tab');
		const ic = this.#utils.mk('span', 'mapp-folder-tab-icon');
		const isActive = this.#activeFolderId === folder.id;
		renderFolderIcon(ic, folder.icon, this.#icons, { active: isActive });
		btn.appendChild(ic);
		const lbl = this.#utils.mk('span', 'mapp-folder-tab-label');
		lbl.textContent = labelOverride || folder.name;
		btn.appendChild(lbl);
		const unread = this.#folderUnreadCount(folder.id);
		if (unread > 0) {
			const badge = this.#utils.mk('span', 'mapp-folder-tab-badge');
			badge.textContent = unread > 99 ? '99+' : String(unread);
			btn.appendChild(badge);
		}
		btn.title = lbl.textContent;
		btn.dataset.folderId = folder.id;
		if (isActive) btn.classList.add('mapp-folder-tab--active');
		btn.addEventListener('click', () => this.#selectFolder(folder.id, { fromUser: true }));
		return btn;
	}

	#renderFoldersBar() {
		const bar = this.el.foldersBar;
		if (!bar) return;
		bar.innerHTML = '';
		const visibleFolders = this.#folders.filter(f => !f.isArchive);
		if (!visibleFolders.length) {
			bar.hidden = true;
			return;
		}
		bar.hidden = false;

		const allBtn = this.#utils.mk('button', 'mapp-folder-tab');
		const allLbl = this.#utils.mk('span', 'mapp-folder-tab-label');
		allLbl.textContent = this.#i18n.t('allChats');
		allBtn.appendChild(allLbl);
		const allUnread = (this.#allChatsRef || [])
			.filter(c => !this.#archivedChatIds().has(c.id))
			.reduce((s, c) => s + (c.unreadCount || 0), 0);
		if (allUnread > 0) {
			const badge = this.#utils.mk('span', 'mapp-folder-tab-badge');
			badge.textContent = allUnread > 99 ? '99+' : String(allUnread);
			allBtn.appendChild(badge);
		}
		allBtn.dataset.folderId = '';
		if (!this.#activeFolderId) allBtn.classList.add('mapp-folder-tab--active');
		allBtn.addEventListener('click', () => this.#selectFolder(null, { fromUser: true }));
		bar.appendChild(allBtn);

		visibleFolders.forEach(folder => {
			bar.appendChild(this.#renderFolderTab(folder));
		});
	}

	startSearch(chat, i18n) {
		this.#searchMode = { chat };
		const label = i18n.t('searchInChat', chat.name || '');
		if (this.el.searchRow) this.el.searchRow.classList.remove('mapp-search-row--collapsed');
		if (this.el.searchWrap) this.el.searchWrap.classList.remove('mapp-search-wrap--collapsed');
		if (this.el.searchInput) {
			this.el.searchInput.value = '';
			this.el.searchInput.placeholder = label;
			this.el.searchInput.focus();
		}
		if (this.el.searchClearBtn) this.el.searchClearBtn.hidden = false;
		this.#resetFolderSwipe();
		if (this.el.chatListPanel) {
			this.el.chatListPanel.innerHTML = '';
			const hint = this.#utils.mk('div', 'mapp-list-empty');
			hint.textContent = label;
			this.el.chatListPanel.appendChild(hint);
		}
	}

	#exitSearch() {
		this.#searchMode = null;
		if (this.el.searchInput) {
			this.el.searchInput.value = '';
			this.el.searchInput.placeholder = this.#i18n.t('searchChats');
		}
		if (this.el.searchClearBtn) this.el.searchClearBtn.hidden = true;
		this.el._filterQuery = '';
		this.el._onFilter && this.el._onFilter('');
	}

	#filterChatsForFolder(chats, folderId, filterQuery) {
		const archivedIds = this.#archivedChatIds();
		let displayChats = chats;
		const q = filterQuery;
		if (q && q.length >= MessengerSidebar.MIN_SEARCH_LEN) {
			displayChats = displayChats.filter(c =>
				(c.name || '').toLowerCase().includes(q));
		}
		if (folderId === this.#archiveFolderId && this.#archiveFolderId) {
			displayChats = displayChats.filter(c => archivedIds.has(c.id));
		} else if (folderId) {
			const chatIdsInFolder = new Set(
				this.#folderMembers.filter(m => m.folderId === folderId).map(m => m.chatId)
			);
			displayChats = displayChats.filter(c => chatIdsInFolder.has(c.id));
		} else {
			displayChats = displayChats.filter(c => !archivedIds.has(c.id));
		}
		return displayChats.slice().sort((a, b) => {
			const ta = a.lastMessageTime ? new Date(a.lastMessageTime).getTime() : 0;
			const tb = b.lastMessageTime ? new Date(b.lastMessageTime).getTime() : 0;
			return tb - ta;
		});
	}

	#renderPanelContent(panelEl, folderId, chats, activeChat, i18n, opts = {}) {
		if (!panelEl || !i18n) return;
		panelEl.innerHTML = '';
		const displayChats = this.#filterChatsForFolder(
			chats,
			folderId,
			this.el._filterQuery
		);

		if (!displayChats.length) {
			const empty = this.#utils.mk('div', 'mapp-list-empty');
			empty.textContent = opts.listLoading ? i18n.t('loading') : i18n.t('noChats');
			panelEl.appendChild(empty);
			return;
		}

		displayChats.forEach(chat => {
			panelEl.appendChild(this.#buildChatItem(chat, activeChat));
		});
	}

	renderChatList(chats, activeChat, i18n, opts = {}) {
		if (!this.el.chatListPanel) return;
		this.#allChatsRef = chats;
		this.#lastActiveChat = activeChat;
		this.#lastI18n = i18n;
		this.#renderFoldersBar();
		if (this.#searchMode) return;
		if (this.#folderSwipeLock) return;
		this.#renderPanelContent(
			this.el.chatListPanel,
			this.#activeFolderId,
			chats,
			activeChat,
			i18n,
			opts
		);
	}

	#buildChatItem(chat, activeChat) {
		const item = this.#utils.mk('div', 'mapp-chat-item');
		if (activeChat?.id === chat.id) item.classList.add('mapp-chat-item--active');
		item.dataset.chatId = chat.id;
		const displayName = chat.name || this.#i18n.t('unnamed');
		const presence = this.#canShowContactPresence()
			&& chat.type === 'direct'
			&& chat.contactUserId
			? this.#presence?.get(chat.contactUserId)
			: null;
		const avatar = presence === 'online' || presence === 'idle'
			? this.#avatarBuilder.buildWithPresence(chat.id, displayName, chat.avatar || null, 48, presence)
			: this.#avatarBuilder.build(chat.id, displayName, chat.avatar || null, 48);
		const info = this.#utils.mk('div', 'mapp-chat-item-info');
		const row1 = this.#utils.mk('div', 'mapp-chat-item-row');
		const nameEl = this.#utils.mk('span', 'mapp-chat-item-name');
		nameEl.textContent = displayName;
		const timeEl = this.#utils.mk('span', 'mapp-chat-item-time');
		timeEl.textContent = chat.lastMessageTime ? this.#utils.formatListTime(chat.lastMessageTime) : '';
		const isGroupChat = chat.type === 'group' || chat.type === 'public_group';
		if (isGroupChat) {
			const typeIcon = this.#utils.mk('span', 'mapp-chat-item-type-icon');
			typeIcon.innerHTML = this.#icons.groupUsers();
			typeIcon.title = this.#i18n.t('sectionLabels')?.group || 'group';
			row1.append(typeIcon, nameEl, timeEl);
		} else {
			row1.append(nameEl, timeEl);
		}
		const row2 = this.#utils.mk('div', 'mapp-chat-item-row');
		const previewEl = this.#utils.mk('span', 'mapp-chat-item-preview');
		const preview = MessengerChatListPreview.getDisplay(chat.lastMessage || '', this.#i18n);
		if (preview.locked) previewEl.classList.add('mapp-chat-item-preview--locked');
		previewEl.textContent = preview.text;
		const badgeWrap = this.#utils.mk('span', 'mapp-badge-wrap');
		if (chat.unreadCount > 0) {
			const badge = this.#utils.mk('span', 'mapp-badge');
			badge.textContent = chat.unreadCount > 99 ? '99+' : chat.unreadCount;
			badgeWrap.appendChild(badge);
		}
		row2.append(previewEl, badgeWrap);
		info.append(row1, row2);
		item.append(avatar, info);
		bindTapAction(item, () => {
			if (this.el._onChatSelect) this.el._onChatSelect(chat);
		});

		// Context menu
		item.addEventListener('contextmenu', e => {
			e.preventDefault();
			this.#showContextMenu(e, chat);
		});

		return item;
	}

	#buildFolderMoveMenuChildren(chat) {
		const folderTargets = [...this.#folders];
		if (this.#archiveFolderId) {
			folderTargets.unshift({
				id: this.#archiveFolderId,
				name: this.#i18n.t('archiveFolder'),
				icon: '',
				isArchive: true,
			});
		}
		return folderTargets.map(folder => ({
			label: folder.icon ? `${folder.icon} ${folder.name}` : folder.name,
			active: this.isChatInFolder(chat.id, folder.id),
			action: () => this.#onChatAction?.('moveToFolder', chat, folder.id),
		}));
	}

	#showContextMenu(e, chat) {
		document.querySelectorAll('.mapp-chat-context-menu').forEach(m => m.remove());
		MobileBottomSheetMenu.close(false);

		const isGroup = chat.type === 'group' || chat.type === 'public_group';
		const sheetItems = [];

		const pushItem = (icon, label, danger, action) => {
			sheetItems.push({ icon, label, danger, action });
		};

		if (!isGroup) {
			pushItem(this.#icons.profile(), this.#i18n.t('showProfile'), false, () => {
				this.#onChatAction?.('showProfile', chat);
			});
		}
		pushItem(this.#icons.eraser(), this.#i18n.t('clearHistory'), false, () => {
			this.#onChatAction?.('clearHistory', chat);
		});

		const folderChildren = this.#buildFolderMoveMenuChildren(chat);
		if (folderChildren.length > 0) {
			sheetItems.push({
				icon: this.#icons.folder(),
				label: this.#i18n.t('moveToFolder'),
				children: folderChildren,
			});
		}

		if (isGroup) {
			pushItem(this.#icons.block(), this.#i18n.t('blockGroup'), true, () => {
				this.#onChatAction?.('blockGroup', chat);
			});
			pushItem(this.#icons.exitGroup(), this.#i18n.t('leaveGroup'), true, () => {
				this.#onChatAction?.('leaveGroup', chat);
			});
		} else {
			pushItem(this.#icons.block(), this.#i18n.t('blockUser'), true, () => {
				this.#onChatAction?.('blockUser', chat);
			});
			pushItem(this.#icons.trash(), this.#i18n.t('deleteChat'), true, () => {
				this.#onChatAction?.('deleteChat', chat);
			});
		}

		if (isMobileSheetMenu()) {
			MobileBottomSheetMenu.open({
				title: chat.name || '',
				items: sheetItems,
				themeManager: this.#themeManager,
				i18n: this.#i18n,
				icons: this.#icons,
			});
			return;
		}

		const menu = this.#utils.mk('div', 'mapp-chat-context-menu');
		this.#themeManager?.applyChatVars?.(menu);

		const addItem = (icon, label, danger, action) => {
			const item = this.#utils.mk('div', 'mapp-context-menu-item');
			if (danger) item.classList.add('mapp-context-menu-item--danger');
			if (icon) { const ic = this.#utils.mk('span', 'mapp-context-menu-item-icon'); ic.innerHTML = icon; item.appendChild(ic); }
			const lbl = this.#utils.mk('span');
			lbl.textContent = label;
			item.appendChild(lbl);
			item.addEventListener('click', () => { menu.remove(); action(); });
			menu.appendChild(item);
		};

		sheetItems.forEach(def => {
			if (def.children?.length) {
				const folderItem = this.#utils.mk('div', 'mapp-context-menu-item mapp-context-menu-item--sub');
				const folderIc = this.#utils.mk('span', 'mapp-context-menu-item-icon');
				folderIc.innerHTML = def.icon || '';
				const folderLbl = this.#utils.mk('span');
				folderLbl.textContent = def.label;
				const folderArrow = this.#utils.mk('span', 'mapp-context-menu-arrow');
				folderArrow.innerHTML = '›';
				folderItem.append(folderIc, folderLbl, folderArrow);

				const subMenu = this.#utils.mk('div', 'mapp-context-submenu');
				def.children.forEach(child => {
					const fItem = this.#utils.mk('div', 'mapp-context-menu-item');
					if (child.active) fItem.classList.add('mapp-context-menu-item--active');
					const lbl = this.#utils.mk('span');
					lbl.textContent = child.label;
					fItem.appendChild(lbl);
					if (child.active) {
						const chk = this.#utils.mk('span', 'mapp-context-menu-check');
						chk.innerHTML = this.#icons.check();
						fItem.appendChild(chk);
					}
					fItem.addEventListener('click', () => { menu.remove(); child.action?.(); });
					subMenu.appendChild(fItem);
				});
				folderItem.appendChild(subMenu);
				folderItem.addEventListener('mouseenter', () => subMenu.classList.add('mapp-context-submenu--open'));
				folderItem.addEventListener('mouseleave', () => subMenu.classList.remove('mapp-context-submenu--open'));
				menu.appendChild(folderItem);
			} else {
				addItem(def.icon, def.label, def.danger, def.action);
			}
		});

		document.body.appendChild(menu);
		const mw = menu.offsetWidth;
		const mh = menu.offsetHeight;
		let x = e.clientX;
		let y = e.clientY;
		if (x + mw > window.innerWidth) x = window.innerWidth - mw - 4;
		if (y + mh > window.innerHeight) y = window.innerHeight - mh - 4;
		menu.style.left = x + 'px';
		menu.style.top = y + 'px';

		attachMenuDismiss(menu, () => menu.remove());
	}

	setThemeManager(tm) {
		this.#themeManager = tm;
	}

	#themeManager = null;

	updateUnreadBadge(chatId, count, chats) {
		const chat = chats.find(c => c.id === chatId);
		if (!chat) return;
		chat.unreadCount = count;
		const ref = this.#allChatsRef.find(c => c.id === chatId);
		if (ref) ref.unreadCount = count;
		this.#renderFoldersBar();
		const item = this.el.chatList?.querySelector(`[data-chat-id="${chatId}"]`);
		if (!item) return;
		const wrap = item.querySelector('.mapp-badge-wrap');
		if (!wrap) return;
		wrap.innerHTML = '';
		if (count > 0) {
			const badge = this.#utils.mk('span', 'mapp-badge');
			badge.textContent = count > 99 ? '99+' : count;
			wrap.appendChild(badge);
		}
	}

	setActiveItem(chatId) {
		this.el.chatList?.querySelectorAll('.mapp-chat-item').forEach(el =>
			el.classList.toggle('mapp-chat-item--active', el.dataset.chatId === chatId)
		);
	}
}

/** Порог бездействия в открытом чате: не слать «прочитано», если пользователь давно не взаимодействовал с панелью. */
class MessengerChatReadGate {
	static IDLE_MS = 5 * 60 * 1000;
	#lastEngagement = new Map();
	#boundAreas = new WeakSet();

	recordEngagement(chatId) {
		if (chatId) this.#lastEngagement.set(chatId, Date.now());
	}

	bindMsgArea(chatId, msgArea, isVisibleFn) {
		if (!msgArea || !chatId || this.#boundAreas.has(msgArea)) return;
		this.#boundAreas.add(msgArea);
		const bump = () => {
			if (typeof isVisibleFn === 'function' && !isVisibleFn()) return;
			this.recordEngagement(chatId);
		};
		['scroll', 'keydown', 'pointerdown', 'touchstart', 'wheel', 'focusin'].forEach((ev) => {
			msgArea.addEventListener(ev, bump, { passive: true });
		});
		const panel = msgArea.closest('.mapp-chat-panel, .mc-chat-embed');
		const input = panel?.querySelector('.mc-input-field, textarea.mc-input, input.mc-input');
		if (input) input.addEventListener('input', bump, { passive: true });
		bump();
	}

	shouldMarkRead(chatId, { isActiveChat, isChatVisible }) {
		if (!chatId || !isActiveChat || !isChatVisible) return false;
		if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return false;
		const last = this.#lastEngagement.get(chatId) || 0;
		return Date.now() - last <= MessengerChatReadGate.IDLE_MS;
	}
}

class MessengerAppView {
	#utils;
	#icons;
	#themeManager;
	#i18n;
	#sidebar;
	#panelFactory;
	#readGate;
	#modal;
	#api;
	#fileTransferTypes;
	#settingsModal;
	#profileModal;
	#groupProfileModal;
	#avatarBuilder;
	#presence = null;
	#connectionStateMgr = null;
	#onClearChatCache = null;
	#currentUser = null;
	/** @type {Map<string, string>} */
	#contactLogins = new Map();
	#activeState = null;
	#activeChat = null;
	#chats = [];
	#chatsBootLoading = false;
	/** @type {Map<string, { state: object, chat: object, stale: boolean }>} */
	#panelPool = new Map();
	#panelPoolOrder = [];
	#msgService = null;
	static PANEL_POOL_MAX = 5;
	#mobilePopstateHandler = null;
	#keyboardLayoutDestroy = null;
	static NAV_SESSION_PREFIX = 'mapp.nav.';
	el = {};
	constructor(utils, icons, themeManager, i18n, sidebar, panelFactory, modal, api, fileTransferTypes = [], settingsModal = null, profileModal = null, groupProfileModal = null, avatarBuilder = null, readGate = null) {
		this.#readGate = readGate || new MessengerChatReadGate();
		this.#utils = utils;
		this.#icons = icons;
		this.#themeManager = themeManager;
		this.#i18n = i18n;
		this.#sidebar = sidebar;
		this.#panelFactory = panelFactory;
		this.#modal = modal;
		this.#api = api;
		this.#fileTransferTypes = fileTransferTypes;
		this.#settingsModal = settingsModal;
		this.#profileModal = profileModal;
		this.#groupProfileModal = groupProfileModal;
		this.#avatarBuilder = avatarBuilder;
	}

	getReadGate() {
		return this.#readGate;
	}

	isChatVisibleForRead(chatId) {
		return this.#isChatVisible(chatId);
	}

	markReadIfEngaged(chatId) {
		if (!this.#readGate.shouldMarkRead(chatId, {
			isActiveChat: this.#activeChat?.id === chatId,
			isChatVisible: this.#isChatVisible(chatId),
		})) return;
		this.#api.markRead(chatId).catch(() => {});
	}

	clearUnread(chatId) {
		const chat = this.#chats.find(c => c.id === chatId);
		if (!chat || !chat.unreadCount) return;
		chat.unreadCount = 0;
		this.#sidebar.updateUnreadBadge(chatId, 0, this.#chats);
	}

	getChatNotificationInfo(chatId) {
		const chat = this.#chats.find(c => c.id === chatId);
		if (!chat) return null;
		const isGroup = chat.type === 'group' || chat.type === 'public_group';
		return { isGroup, name: chat.name || '' };
	}

	async receiveOwnMessage(chatId, msg, listPreviewSource = null) {
		const meId = this.#currentUser?.id;
		if (meId && msg.senderId === meId) msg.isOwn = true;
		if (this.#activeState?.chatId === chatId) {
			if (this.#isMessageAlreadyInPanel(this.#activeState, msg.id)) {
				const chat = this.#chats.find(c => c.id === chatId);
				if (chat) {
					await this.#setChatListPreview(chat, chatId, listPreviewSource || msg, msg.timestamp);
					this.#renderChatList();
				}
				return;
			}
			const uploadRow = this.#activeState.msgArea?.querySelector(
				'.mc-file-upload-row[data-local-upload-id]:not([data-msg-id])'
			);
			if (uploadRow && msg.isOwn) {
				await this.#panelFactory.attachFileUploadMessage(
					this.#activeState,
					uploadRow.dataset.localUploadId,
					msg,
					uploadRow,
					msg.text
				);
				const chat = this.#chats.find(c => c.id === chatId);
				if (chat) {
					await this.#setChatListPreview(chat, chatId, listPreviewSource || msg, msg.timestamp);
					this.#renderChatList();
				}
				return;
			}
			for (const [, entry] of this.#activeState.messages) {
				const d = entry.data;
				if (!d?.isOwn) continue;
				if (d.id === msg.id || d.serverId === msg.id) {
					return this.receiveMessage(chatId, msg, listPreviewSource);
				}
			}
			const pending = [...this.#activeState.messages.values()].find((e) => {
				const d = e.data;
				return d?.isOwn && MessengerUtils.isLocalMessageId(d.id) && !d.serverId;
			});
			if (pending) {
				await this.#panelFactory.confirmServerMessage(this.#activeState, pending.data.id, msg);
				const chat = this.#chats.find(c => c.id === chatId);
				if (chat) {
					await this.#setChatListPreview(chat, chatId, listPreviewSource || msg, msg.timestamp);
					this.#renderChatList();
				}
				return;
			}
		}
		return this.receiveMessage(chatId, msg, listPreviewSource);
	}

	setPresenceManager(presence) {
		this.#presence = presence;
		this.#sidebar.setPresenceManager(presence);
		presence?.subscribe(() => {
			this.#renderChatList();
			this.#refreshActiveChatHeader();
		});
		this.#startDirectHeaderSubTicker();
	}

	#directHeaderSubTimer = null;

	#startDirectHeaderSubTicker() {
		if (this.#directHeaderSubTimer) return;
		this.#directHeaderSubTimer = setInterval(() => {
			const chat = this.#activeChat;
			if (!chat || chat.type !== 'direct' || !chat.contactUserId) return;
			const presence = this.#presence?.get(chat.contactUserId);
			if (presence === 'online' || presence === 'idle') return;
			if (!chat.contactLastSeenAt) return;
			this.#refreshDirectChatHeaderSub(chat);
		}, 60000);
	}

	setConnectionStateManager(mgr) {
		this.#connectionStateMgr = mgr;
		this.#sidebar.setConnectionStateManager(mgr);
		mgr?.subscribe((state) => {
			if (state === MessengerConnectionStateManager.STATE_CONNECTED) {
				this.#prefetchAllDirectContactPresence();
			}
			this.#refreshActiveChatHeader();
			if (this.#activeChat?.type === 'direct') {
				this.#refreshDirectChatHeaderSub(this.#activeChat);
			}
		});
	}

	#canShowContactPresence() {
		return this.#connectionStateMgr?.state === MessengerConnectionStateManager.STATE_CONNECTED;
	}

	#prefetchAllDirectContactPresence() {
		const seen = new Set();
		for (const chat of this.#chats) {
			if (chat.type !== 'direct' || !chat.contactUserId || seen.has(chat.contactUserId)) continue;
			seen.add(chat.contactUserId);
			this.#prefetchDirectContactPresence(chat);
		}
	}

	setOnNetworkReconnect(fn) { this.#sidebar.setOnNetworkReconnect(fn); }

	setOnClearChatCache(fn) { this.#onClearChatCache = fn; }

	#refreshActiveChatHeader() {
		if (!this.#activeChat || !this.#activeState?.el) return;
		const chat = this.#activeChat;
		if (chat.type !== 'direct' || !chat.contactUserId) return;
		const canShow = this.#canShowContactPresence();
		const presence = canShow ? this.#presence?.get(chat.contactUserId) : null;
		const info = this.#activeState.el.querySelector('.mc-header-info');
		if (!info) return;
		const profileHit = info.querySelector('.mc-header-profile-hit');
		const scope = profileHit || info;
		const old = scope.querySelector('.mc-avatar-wrap') || scope.querySelector('.mc-avatar');
		if (!old) return;
		const next = presence === 'online' || presence === 'idle'
			? this.#avatarBuilder.buildWithPresence(
				chat.id, chat.name || '', chat.avatar || null, 32, presence
			)
			: this.#avatarBuilder.build(chat.id, chat.name || '', chat.avatar || null, 32);
		old.replaceWith(next);
		this.#refreshDirectChatHeaderSub(chat);
	}
	render(container) {
		container.innerHTML = '';
		document.body.classList.add('sm-messenger-active');
		const root = this.#utils.mk('div', 'mapp-root');
		const hasUiContext = typeof UI !== 'undefined' && UI;
		root.classList.add(hasUiContext ? 'mapp-has-ui' : 'mapp-no-ui');
		this.#themeManager.apply(this.#themeManager.current);
		const sidebarEl = this.#sidebar.render(
			() => this.#modal.open((chat) => this.#onChatCreated(chat)),
			(chat) => this.#openChat(chat)
		);
		const chatArea = this.#utils.mk('div', 'mapp-chat-area');
		const panelPoolHost = this.#utils.mk('div', 'mapp-panel-pool-host');
		panelPoolHost.setAttribute('aria-hidden', 'true');
		const empty = this.#utils.mk('div', 'mapp-placeholder');
		empty.textContent = this.#i18n.t('selectChat');
		chatArea.appendChild(empty);
		root.append(sidebarEl, chatArea, panelPoolHost);
		container.appendChild(root);
		this.el.root = root;
		this.el.chatArea = chatArea;
		this.el.panelPoolHost = panelPoolHost;
		this.el.empty = empty;
		this.el.placeholder = empty;
		this.#sidebar.setOnFilter((q) => this.#filterChats(q));
		this.#sidebar.setOnFolderSelect(() => {
			this.#filterChats(this.#sidebar.el._filterQuery || '');
			this.#persistNavState();
		});
		this.#sidebar.setOnChatAction(async (action, chat, extra) => {
			if (action === 'showProfile') await this.#showContactProfile(chat);
			else if (action === 'clearHistory') await this.#clearChatHistory(chat);
			else if (action === 'blockUser') await this.#blockUser(chat);
			else if (action === 'blockGroup') await this.#blockGroup(chat);
			else if (action === 'deleteChat') await this.#deleteOrLeaveChat(chat, false);
			else if (action === 'leaveGroup') await this.#deleteOrLeaveChat(chat, true);
			else if (action === 'moveToFolder') await this.#moveChatToFolder(chat, extra);
			else if (action === 'createFolder') await this.#createFolder(chat);
		});
		if (this.#profileModal) {
			this.#sidebar.setOnUserClick(() => {
				if (!this.#currentUser) return;
				this.#profileModal.open(this.el.root, this.#currentUser, {
					onUserUpdated: (u) => this.setCurrentUser(u),
					api: this.#api,
					onFoldersChanged: () => this.loadFolders(),
					onOpenArchive: () => {
						this.#profileModal.close();
						this.#sidebar.openArchiveFolder();
					},
					onCreateFolder: () => this.promptCreateFolder(null),
					onLogout: async () => {
						window.AppBootLog?.clear?.();
						SupraAuthCrypto.clearOnLogout(this.#currentUser?.id);
						await fetch('/api/auth/logout', {
							method: 'POST',
							credentials: 'same-origin',
						});
						window.location.href = '/login.html';
					},
				});
			});
		}
		this.#bindMobilePopstate();
		this.#bindMobileKeyboardLayout();
		this.#bindDesktopLayout(root);
	}

	#bindMobileKeyboardLayout() {
		this.#keyboardLayoutDestroy?.();
		this.#keyboardLayoutDestroy = null;
		if (!MessengerUtils.isMobile() || !this.el.chatArea) return;
		this.#keyboardLayoutDestroy = MessengerUtils.initMobileKeyboardLayout(
			this.el.chatArea,
			{
				mode: 'inset',
				shouldApply: () => this.el.root?.classList.contains('mapp-show-chat'),
			},
		);
	}

	#bindDesktopLayout(root) {
		let lastDesktop = null;
		const update = () => {
			const isDesktop = window.innerWidth >= 1200;
			if (isDesktop === lastDesktop) return;
			lastDesktop = isDesktop;
			root.classList.toggle('mapp-desktop', isDesktop);

			const foldersBar = this.#sidebar.el.foldersBar;
			const sidebarMain = this.#sidebar.el.sidebarMain;
			const sidebar = this.#sidebar.el.sidebar;
			if (!foldersBar || !sidebarMain || !sidebar) return;

			if (isDesktop) {
				sidebar.insertBefore(foldersBar, sidebarMain);
			} else {
				const chatList = this.#sidebar.el.chatList;
				sidebarMain.insertBefore(foldersBar, chatList || null);
			}
		};
		update();
		window.addEventListener('resize', update);
	}
	#bindMobilePopstate() {
		if (this.#mobilePopstateHandler) {
			window.removeEventListener('popstate', this.#mobilePopstateHandler);
		}
		this.#mobilePopstateHandler = () => {
			// Закрытие оверлеев делает глобальный слушатель (он зарегистрирован раньше).
			// Здесь только проверяем, не было ли событие им обработано.
			if (messengerPopstateWasConsumed()) return;
			if (!MessengerUtils.isMobile()) return;
			if (!this.el.root?.classList.contains('mapp-show-chat')) return;
			if (messengerHistoryHasStackedOverlay()) return;
			this.#showChatListMobile();
		};
		window.addEventListener('popstate', this.#mobilePopstateHandler);
	}
	#isPhonePortrait() {
		if (!MessengerUtils.isMobile()) {
			return false;
		}
		if (window.matchMedia) {
			return window.matchMedia('(orientation: portrait)').matches;
		}
		return window.innerHeight > window.innerWidth;
	}
	#hideBottomNavigationBar() {
		if (typeof UI !== 'undefined' &&
			UI &&
			typeof UI.hideBottomNavigationBar === 'function') {
			UI.hideBottomNavigationBar();
		}
	}
	#showBottomNavigationBar() {
		if (typeof UI !== 'undefined' &&
			UI &&
			typeof UI.showBottomNavigationBar === 'function') {
			UI.showBottomNavigationBar();
		}
	}
	#activeChatForSidebar() {
		if (MessengerUtils.isMobile() && !this.el.root?.classList.contains('mapp-show-chat')) {
			return null;
		}
		return this.#activeChat;
	}

	#renderChatList() {
		this.#sidebar.renderChatList(this.#chats, this.#activeChatForSidebar(), this.#i18n, {
			listLoading: this.#chatsBootLoading,
		});
	}

	setChatsBootLoading(loading) {
		this.#chatsBootLoading = !!loading;
		this.#renderChatList();
	}

	#showChatListMobile() {
		this.#parkActivePanel();
		this.el.root.classList.remove('mapp-show-chat');
		this.#keyboardLayoutDestroy?.apply?.();
		this.el.empty.hidden = false;
		this.#activeChat = null;
		this.#sidebar.setActiveItem(null);
		this.#renderChatList();
		this.#showBottomNavigationBar();
		this.#persistNavState();
		if (history.state?.mappChatOpen) {
			history.replaceState(null, '', window.location.pathname + window.location.search);
		}
	}
	#isChatVisible(chatId) {
		if (!this.#activeState || this.#activeState.chatId !== chatId) return false;
		if (!MessengerUtils.isMobile()) return true;
		return this.el.root?.classList.contains('mapp-show-chat');
	}
	isActiveChatId(chatId) {
		return this.#activeChat?.id === chatId;
	}

	getActiveChatId() {
		return this.#activeChat?.id || null;
	}
	setMessageService(msgService) {
		this.#msgService = msgService;
	}

	async refreshLastMessagePreviews() {
		if (!this.#chats?.length) {
			this.#renderChatList();
			return;
		}
		if (this.#msgService) {
			await Promise.all(this.#chats.map(async (c) => {
				try {
					const messages = await this.#msgService.getCachedMessages(c.id);
					const last = MessengerChatListPreview.pickLastVisibleMessage(messages);
					if (!last) return;
					const stored = MessengerChatListPreview.storageText(last);
					if (!stored || MessengerChatListPreview.isLockedStorage(stored)) return;
					c.lastMessage = stored;
				} catch (e) {
					console.warn('[MessengerAppView] refreshLastMessagePreviews', c.id, e);
				}
			}));
		}
		this.#renderChatList();
	}

	async #setChatListPreview(chat, chatId, previewSrc, timestamp) {
		const stored = typeof previewSrc === 'string'
			? previewSrc
			: MessengerChatListPreview.storageText(previewSrc);
		if (stored === null) return;
		chat.lastMessage = stored;
		chat.lastMessageTime = timestamp instanceof Date ? timestamp : new Date(timestamp);
	}

	async refreshChatListPreview(chatId) {
		const chat = this.#chats.find(c => c.id === chatId);
		if (!chat) return;
		if (this.#msgService) {
			try {
				const messages = await this.#msgService.getCachedMessages(chatId);
				const last = MessengerChatListPreview.pickLastVisibleMessage(messages);
				if (last) {
					const ts = last.timestamp instanceof Date
						? last.timestamp
						: new Date(last.timestamp);
					await this.#setChatListPreview(chat, chatId, last, ts);
					this.#renderChatList();
					return;
				}
			} catch (e) {
				console.warn('[MessengerAppView] refreshChatListPreview cache', e);
			}
		}
		try {
			const chats = await this.#api.getChats();
			const fresh = chats.find(c => c.id === chatId);
			if (fresh) {
				if (fresh.lastMessage) {
					await this.#setChatListPreview(
						chat,
						chatId,
						fresh.lastMessage,
						fresh.lastMessageTime || new Date()
					);
				} else {
					chat.lastMessage = '';
					chat.lastMessageTime = fresh.lastMessageTime;
				}
				this.#renderChatList();
			}
		} catch (e) {
			console.warn('[MessengerAppView] refreshChatListPreview getChats', e);
		}
	}
	setChats(chats) {
		this.#chatsBootLoading = false;
		this.#chats = chats;
		this.#renderChatList();
		if (this.#canShowContactPresence()) {
			this.#prefetchAllDirectContactPresence();
		}
	}
	setCurrentUser(user) {
		if (!user) return;
		const prev = this.#currentUser;
		this.#currentUser = {
			...user,
			statusText: user.statusText !== undefined
				? (user.statusText || '')
				: (prev?.statusText || ''),
		};
		if (user.id && user.login) this.#contactLogins.set(user.id, user.login);
		this.#sidebar.updateUser(this.#currentUser);
	}

	handleLoginChanged({ userId, oldLogin, newLogin, displayName } = {}) {
		if (!userId || !newLogin) return;
		const me = this.#currentUser;
		if (me?.id === userId) {
			this.setCurrentUser({ ...me, login: newLogin });
			return;
		}
		this.#contactLogins.set(userId, newLogin);
		const name = displayName
			|| this.#chats.find(c => c.contactUserId === userId)?.name
			|| newLogin;
		MessengerDialog.showNotice(
			this.#i18n.t('contactLoginChanged', name, oldLogin || '', newLogin),
			this.#i18n.t('confirm'),
			null,
			this.#themeManager
		);
	}

	getCurrentUser() {
		return this.#currentUser;
	}
	#filterChats(q) {
		this.#renderChatList();
	}

	#navSessionKey() {
		const id = this.#currentUser?.id;
		return id ? `${MessengerAppView.NAV_SESSION_PREFIX}${id}` : null;
	}

	#persistNavState() {
		// Навигация не сохраняется между перезагрузками — всегда стартуем на «Все чаты».
	}

	async restoreNavState() {
		if (/^\/@[^/?#]+/i.test(window.location.pathname)) return;
		const key = this.#navSessionKey();
		if (key) {
			try { localStorage.removeItem(key); } catch { /* ignore */ }
		}
		this.#sidebar.selectFolder(null, { instant: true });
		this.#parkActivePanel();
		this.#activeChat = null;
		this.#sidebar.setActiveItem(null);
		if (this.el.empty) this.el.empty.hidden = false;
		if (MessengerUtils.isMobile()) {
			this.el.root?.classList.remove('mapp-show-chat');
			this.#showBottomNavigationBar();
			if (history.state?.mappChatOpen) {
				history.replaceState(null, '', window.location.pathname + window.location.search);
			}
		}
		this.#renderChatList();
	}
	#touchPanelPoolOrder(chatId) {
		const i = this.#panelPoolOrder.indexOf(chatId);
		if (i >= 0) this.#panelPoolOrder.splice(i, 1);
		this.#panelPoolOrder.push(chatId);
	}

	#trimPanelPool() {
		while (this.#panelPoolOrder.length > MessengerAppView.PANEL_POOL_MAX) {
			const evictId = this.#panelPoolOrder.shift();
			if (evictId && this.#panelPool.has(evictId)) this.#evictPanel(evictId);
		}
	}

	#markPanelStale(chatId) {
		const entry = this.#panelPool.get(chatId);
		if (entry) entry.stale = true;
	}

	#evictPanel(chatId) {
		if (!chatId) return;
		const idx = this.#panelPoolOrder.indexOf(chatId);
		if (idx >= 0) this.#panelPoolOrder.splice(idx, 1);
		const pooled = this.#panelPool.get(chatId);
		if (pooled) {
			this.#panelFactory.destroyPanel(pooled.state);
			pooled.state.el.remove();
			this.#panelPool.delete(chatId);
		}
		if (this.#activeState?.chatId === chatId) {
			this.#panelFactory.destroyPanel(this.#activeState);
			this.#activeState.el.remove();
			this.#activeState = null;
		}
	}

	#clearPanelPool() {
		for (const chatId of [...this.#panelPool.keys()]) {
			this.#evictPanel(chatId);
		}
		this.#panelPoolOrder = [];
	}

	#capturePanelScroll(state) {
		if (!state?.msgArea) return;
		state.savedScrollTop = state.msgArea.scrollTop;
		state.savedScrollHeight = state.msgArea.scrollHeight;
	}

	#restorePanelScroll(state, afterRestore = null) {
		if (!state?.msgArea || state.savedScrollTop == null) {
			afterRestore?.();
			return;
		}
		const msgArea = state.msgArea;
		const savedTop = state.savedScrollTop;
		const savedHeight = state.savedScrollHeight ?? 0;
		const apply = () => {
			void msgArea.offsetHeight;
			const maxScroll = Math.max(0, msgArea.scrollHeight - msgArea.clientHeight);
			let top = savedTop;
			const oldMax = Math.max(0, savedHeight - msgArea.clientHeight);
			if (oldMax > 0 && maxScroll > 0 && Math.abs(oldMax - maxScroll) > 2) {
				top = (savedTop / oldMax) * maxScroll;
			}
			msgArea.scrollTop = Math.min(Math.max(0, top), maxScroll);
			afterRestore?.();
		};
		requestAnimationFrame(() => requestAnimationFrame(apply));
	}

	#updateScrollDownBtn(state) {
		const msgArea = state?.msgArea;
		if (!msgArea) return;
		const fromBottom = msgArea.scrollHeight - msgArea.scrollTop - msgArea.clientHeight;
		const btn = state.el?.querySelector('.mc-scroll-down-btn');
		if (btn) btn.hidden = !(fromBottom > 120 || state.quoteView);
	}

	#relayoutActivePanel(state) {
		if (!state?.el) return;
		MessengerMessageHighlight.clear(state.msgArea);
		this.#restorePanelScroll(state, () => {
			state.stickyDateSep?.refresh?.();
			this.#updateScrollDownBtn(state);
		});
	}

	#parkPanelEntry(state, chat) {
		const chatId = state.chatId;
		if (this.#panelPool.has(chatId)) this.#evictPanel(chatId);
		this.#capturePanelScroll(state);
		MessengerMessageHighlight.clear(state.msgArea);
		if (this.el.panelPoolHost) {
			this.el.panelPoolHost.appendChild(state.el);
		}
		const chatRef = chat || this.#chats.find(c => c.id === chatId);
		this.#panelPool.set(chatId, { state, chat: chatRef, stale: false });
		this.#touchPanelPoolOrder(chatId);
		this.#trimPanelPool();
	}

	#parkActivePanel() {
		if (!this.#activeState) return Promise.resolve();
		const state = this.#activeState;
		const chat = this.#activeChat;
		const chatId = state.chatId;
		const crypto = this.#api.getCrypto();
		const relock = (crypto && chatId)
			? (async () => {
				crypto.clearChatSession(chatId);
				await this.#panelFactory.relockProtectedMessages(state, chatId);
			})()
			: Promise.resolve();
		this.#activeState = null;
		this.#parkPanelEntry(state, chat);
		return relock.catch(e => {
			console.warn('[MessengerAppView] relockProtectedMessages', e);
		});
	}

	#destroyActivePanel() {
		if (!this.#activeState) return;
		this.#evictPanel(this.#activeState.chatId);
	}

	#activateParkedPanel(chat, entry, pendingUnreadCount) {
		this.#panelPool.delete(chat.id);
		const orderIdx = this.#panelPoolOrder.indexOf(chat.id);
		if (orderIdx >= 0) this.#panelPoolOrder.splice(orderIdx, 1);

		entry.state.unreadCount = pendingUnreadCount;
		this.el.chatArea.appendChild(entry.state.el);
		this.#activeState = entry.state;
		this.el.empty.hidden = true;
		this.markReadIfEngaged(chat.id);
		this.#refreshDirectChatHeaderSub(chat);
		if (!entry.state.firstLoadDone) {
			this.#panelFactory.loadHistory(chat.id, entry.state);
		} else {
			this.#relayoutActivePanel(entry.state);
		}
	}

	#createAndOpenPanel(chat, pendingUnreadCount) {
		this.el.empty.hidden = true;
		const onThemeApply = (theme) => {
			this.#themeManager.applyTheme(theme);
		};
		const onSend = async (chatId, field, msgArea) => {
			const text = field.value;
			if (!text?.trim()) return;
			field.value = '';
			const state = this.#activeState;
			if (!state) return;
			const reply = state.replyDraft;
			let outgoingPrep = { encryptionTier: 'basic' };
			let resolved = { tier: 'basic' };
			try {
				resolved = await this.#api.resolveOutgoingEncryption(chat.id, {
					themeManager: this.#themeManager,
					i18n: this.#i18n,
				});
				if (resolved.cancelled) {
					field.value = text;
					return;
				}
				outgoingPrep = await this.#api.prepareOutgoingFields(chat.id, text.trim(), {
					replyToTextPreview: reply?.textPreview || null,
					_resolvedTier: resolved,
					themeManager: this.#themeManager,
					i18n: this.#i18n,
				});
			} catch (e) {
				if (e?.code === 'send-cancelled') {
					field.value = text;
					return;
				}
				console.warn('[MessengerAppView] prepareOutgoingFields', e);
				field.value = text;
				await this.#showSendEncryptionError(e);
				return;
			}
			if (resolved.passwordEntered && this.#activeState?.chatId === chat.id) {
				await this.#refreshChatProtectedMessages(chat);
			}
			const encryptionTier = outgoingPrep.encryptionTier || 'basic';
			const localMsg = {
				id: 'local_' + Date.now() + '_' + Math.random().toString(36).slice(2),
				serverId: null,
				chatId: chat.id,
				senderId: this.#currentUser?.id ?? 'me',
				senderName: this.#currentUser?.name ?? '',
				senderAvatar: this.#currentUser?.avatar ?? null,
				text: text.trim(),
				timestamp: new Date(),
				status: 'sending',
				isOwn: true,
				isVirtual: false,
				contentType: null,
				encryptionTier,
				_encText: outgoingPrep._encText || null,
				_encReplyPreview: outgoingPrep._encReplyPreview || null,
				replyToMessageId: reply?.messageId || null,
				replyToSenderName: reply?.senderName || null,
				replyToTextPreview: reply?.textPreview || null,
			};
			this.#panelFactory.clearReplyDraft(state);
			await this.#panelFactory.appendMsg(state, localMsg);
			await this.#bumpChatPreview(chat.id, localMsg, localMsg.timestamp);
			try {
				const serverMsg = await this.#api.sendMessage(chat.id, text.trim(), {
					localId: localMsg.id,
					replyToMessageId: reply?.messageId || null,
					replyToSenderName: reply?.senderName || null,
					replyToTextPreview: reply?.textPreview || null,
					_resolvedTier: resolved,
					themeManager: this.#themeManager,
					i18n: this.#i18n,
				});
				if (serverMsg?.id) {
					const confirmed = {
						...localMsg,
						id: serverMsg.id,
						serverId: serverMsg.id,
						status: serverMsg.status || 'sent',
						timestamp: serverMsg.timestamp || localMsg.timestamp,
						encryptionTier: serverMsg.encryptionTier || localMsg.encryptionTier,
						_encText: serverMsg._encText || localMsg._encText || null,
						_encReplyPreview: serverMsg._encReplyPreview || localMsg._encReplyPreview || null,
					};
					this.#panelFactory.updateMsgStatus(state, localMsg.id, confirmed.status);
					await this.#panelFactory.confirmServerMessage(state, localMsg.id, confirmed);
					await this.#bumpChatPreview(chat.id, confirmed, confirmed.timestamp);
				}
			} catch (e) {
				console.warn('[MessengerAppView] sendMessage error:', e);
				this.#panelFactory.updateMsgStatus(state, localMsg.id, 'error');
				await this.#showSendEncryptionError(e);
			}
		};
		const chatCallbacks = {
			currentUser: this.#currentUser,
			onShowProfile: (c) => this.#showContactProfile(c),
			onShowGroupProfile: (c) => this.#showGroupProfile(c),
			onChatEncryptionSetPassword: (c) => this.#setChatEncryptionPassword(c),
			onChatEncryptionRemovePassword: (c) => this.#removeChatEncryptionPassword(c),
			onChatEncryptionHasPassword: (c) => !!this.#api.getCrypto()?.getCustomPassword(c?.id),
			onChatEncryptionStatusText: (c) => this.#chatEncryptionStatusText(c),
			onEnterExtraPassword: (c) => this.#enterChatExtraPassword(c),
			onClearHistory: (c) => this.#clearChatHistory(c),
			onDeleteChat: (c) => this.#deleteOrLeaveChat(c, false),
			onLeaveGroup: (c) => this.#deleteOrLeaveChat(c, true),
			onBlockUser: (c) => this.#blockUser(c),
			onBlockGroup: (c) => this.#blockGroup(c),
			onMarkReadIfEngaged: () => this.markReadIfEngaged(chat.id),
		};
		const state = this.#panelFactory.create(
			chat,
			this.el,
			onThemeApply,
			onSend,
			this.#fileTransferTypes,
			chatCallbacks
		);
		state.unreadCount = pendingUnreadCount;
		this.#activeState = state;
		this.el.chatArea.appendChild(state.el);
		this.#panelFactory.loadHistory(chat.id, state);
		this.#refreshDirectChatHeaderSub(chat);
	}

	#prefetchDirectContactPresence(chat) {
		const userId = chat?.contactUserId;
		if (!userId || chat.type !== 'direct') return;
		this.#api.getContactProfile(userId).then(profile => {
			if (!profile) return;
			if (profile.onlineStatus) this.#presence?.update(userId, profile.onlineStatus);
			this.updateContactProfile(userId, {
				statusText: profile.statusText != null ? String(profile.statusText).trim() : '',
				lastSeenAt: profile.lastSeenAt ?? null,
			});
		}).catch(() => {});
	}

	async #openChat(chat) {
		this.#readGate.recordEngagement(chat.id);
		const chatData = this.#chats.find(c => c.id === chat.id) || chat;
		if (chatData.type === 'direct') {
			try {
				const keysCreated = await this.#api.ensureChatEncryptionKeys(chatData);
				if (keysCreated) {
					const cached = this.#panelPool.get(chat.id);
					if (cached) cached.stale = true;
				}
			} catch (e) {
				console.warn('[MessengerAppView] ensureChatEncryptionKeys', e);
			}
		}
		if (this.#isGroupChat(chatData)) {
			try {
				const keysCreated = await this.#api.ensureChatEncryptionKeys(chatData);
				if (keysCreated) {
					const cached = this.#panelPool.get(chat.id);
					if (cached) cached.stale = true;
				}
			} catch (e) {
				console.warn('[MessengerAppView] ensureChatEncryptionKeys (group)', e);
			}
		}
		if (this.#isGroupChat(chatData) && !chatData.hasGroupAutoKey) {
			await MessengerDialog.alert({
				title: this.#i18n.t('masterPasswordLock'),
				message: 'Ключ группы ещё не выдан. Попросите администратора открыть группу или добавить вас снова.',
				themeManager: this.#themeManager,
			});
			return;
		}
		const pendingUnreadCount = chatData?.unreadCount || 0;
		if (chatData?.unreadCount > 0) {
			chatData.unreadCount = 0;
			this.#sidebar.updateUnreadBadge(chat.id, 0, this.#chats);
		}

		if (this.#activeState?.chatId === chat.id && this.#isChatVisible(chat.id)) {
			this.markReadIfEngaged(chat.id);
			return;
		}

		this.#activeChat = chat;
		this.#persistNavState();
		this.#sidebar.setActiveItem(chat.id);
		if (MessengerUtils.isMobile()) {
			if (!this.el.root.classList.contains('mapp-show-chat')) {
				history.pushState({ mappChatOpen: true }, '');
			}
			this.el.root.classList.add('mapp-show-chat');
			this.#keyboardLayoutDestroy?.apply?.();
			if (this.#isPhonePortrait()) {
				this.#hideBottomNavigationBar();
			}
		}

		if (chatData.type === 'direct') this.#prefetchDirectContactPresence(chatData);

		const cached = this.#panelPool.get(chat.id);
		if (cached && !cached.stale) {
			if (this.#activeState?.chatId !== chat.id) {
				await this.#parkActivePanel();
			}
			this.#activateParkedPanel(chat, cached, pendingUnreadCount);
			return;
		}

		if (cached?.stale) {
			this.#evictPanel(chat.id);
		}

		if (this.#activeState?.chatId !== chat.id) {
			await this.#parkActivePanel();
		}
		this.#createAndOpenPanel(chat, pendingUnreadCount);
	}
	#onChatCreated(chat) {
		normalizeAppUrl();
		if (!this.#chats.find(c => c.id === chat.id)) {
			this.#chats.unshift(chat);
			this.#renderChatList();
		}
		this.#openChat(chat);
	}

	#isGroupChat(chat) {
		return chat?.type === 'group' || chat?.type === 'public_group';
	}

	#chatEncryptionStatusText(chat) {
		const crypto = this.#api.getCrypto();
		if (!crypto?.getCustomPassword(chat?.id)) return this.#i18n.t('chatEncryptionStatusUnset');
		return this.#i18n.t('chatEncryptionStatusOn');
	}

	async #setChatEncryptionPassword(chat) {
		await this.#enterChatExtraPassword(chat);
	}

	async #showSendEncryptionError(err) {
		if (!err || err.code === 'send-cancelled') return;
		let message = this.#i18n.t('sendEncryptionKeyFailed');
		if (err.code === 'need-extra-password') {
			message = this.#i18n.t('sendEncryptionNeedExtraPassword');
		} else if (err.code === 'master-mismatch') {
			message = this.#i18n.t('sendEncryptionMasterMismatch');
		} else if (err.message?.includes('Мастер-пароль')) {
			message = err.message;
		}
		await MessengerDialog.alert({
			title: this.#i18n.t('messageFailed'),
			message,
			themeManager: this.#themeManager,
		});
	}

	async #refreshChatProtectedMessages(chat) {
		if (!chat?.id) return { unlocked: 0, failed: 0 };
		const chatData = this.#chats.find(c => c.id === chat.id) || chat;
		try {
			await this.#api.ensureChatEncryptionKeys(chatData);
		} catch (e) {
			console.warn('[MessengerAppView] ensureChatEncryptionKeys on unlock', e);
		}
		let result = { unlocked: 0, failed: 0 };
		if (this.#activeState?.chatId === chat.id) {
			result = await this.#panelFactory.refreshProtectedMessagesDisplay(this.#activeState, chat.id);
		}
		const pooled = this.#panelPool.get(chat.id);
		if (pooled?.state && this.#activeState?.chatId !== chat.id) {
			const pooledResult = await this.#panelFactory.refreshProtectedMessagesDisplay(pooled.state, chat.id);
			result = {
				unlocked: result.unlocked + pooledResult.unlocked,
				failed: result.failed + pooledResult.failed,
			};
		}
		return result;
	}

	async #enterChatExtraPassword(chat) {
		if (!chat?.id) return;
		const crypto = this.#api.getCrypto();
		if (!crypto) {
			await MessengerDialog.alert({
				title: this.#i18n.t('masterPasswordLock'),
				message: this.#i18n.t('masterPasswordLock'),
				themeManager: this.#themeManager,
			});
			return;
		}
		if (!crypto.getCustomPassword(chat.id)) {
			const isGroup = this.#isGroupChat(chat);
			const pwd = await MessengerDialog.promptPassword({
				title: this.#i18n.t('msgActionEnterPassword'),
				message: isGroup
					? this.#i18n.t('groupCustomPasswordHint')
					: (this.#i18n.t('directCustomPasswordHint') || 'Введите доп. пароль, который вам передал собеседник вне мессенджера.'),
				placeholder: this.#i18n.t('groupCustomPasswordPlaceholder'),
				minLength: SupraAuthCrypto.GROUP_EXTRA_MIN_LENGTH,
				confirmLabel: this.#i18n.t('ok'),
				cancelLabel: this.#i18n.t('cancel'),
				themeManager: this.#themeManager,
			});
			if (!pwd) return;
			await crypto.setCustomPassword(chat.id, pwd);
			crypto.invalidateChatKey(chat.id);
		}
		const { unlocked, failed } = await this.#refreshChatProtectedMessages(chat);
		if (unlocked === 0 && failed > 0) {
			crypto.clearSessionCustomPassword(chat.id);
			await MessengerDialog.alert({
				title: this.#i18n.t('msgActionEnterPassword'),
				message: this.#i18n.t('msgLocked'),
				themeManager: this.#themeManager,
			});
		}
	}

	async #removeChatEncryptionPassword(chat) {
		if (!chat?.id) return;
		const crypto = this.#api.getCrypto();
		if (!crypto?.getCustomPassword(chat.id)) return;
		const ok = await MessengerDialog.confirm({
			title: this.#i18n.t('chatEncryptionRemovePassword'),
			message: this.#i18n.t('chatEncryptionRemoveConfirm'),
			confirmLabel: this.#i18n.t('confirm'),
			cancelLabel: this.#i18n.t('cancel'),
			themeManager: this.#themeManager,
		});
		if (!ok) return;
		crypto.clearSessionCustomPassword(chat.id);
		crypto.clearSessionSendBasicOnly(chat.id);
		crypto.setExtraEncryptionEnabled(chat.id, false);
		if (this.#activeState?.chatId === chat.id) {
			await this.#panelFactory.relockProtectedMessages(this.#activeState, chat.id);
		}
	}

	async #showGroupProfile(chat) {
		if (!this.#groupProfileModal || !chat?.id) return;
		await this.#groupProfileModal.open(this.el.root, chat, {
			onUpdated: (meta) => this.updateChatMeta(chat.id, meta),
			onUserBlocked: async (blockedUserId) => {
				const direct = this.#chats.find(c =>
					c.type === 'direct' && c.contactUserId === blockedUserId);
				if (direct) await this.removeChat(direct.id, { showMobileList: false, clearCache: true });
			},
		});
	}

	touchContactLastSeen(userId, at = new Date()) {
		if (!userId) return;
		this.updateContactProfile(userId, { lastSeenAt: at });
	}

	updateContactProfile(userId, { statusText, displayName, avatar, aboutText, lastSeenAt } = {}) {
		if (!userId) return;
		const status = statusText != null ? String(statusText).trim() : null;
		const lastSeen = lastSeenAt !== undefined
			? (lastSeenAt ? new Date(lastSeenAt) : null)
			: undefined;
		for (const chat of this.#chats) {
			if (chat.contactUserId !== userId) continue;
			if (status != null) chat.contactStatusText = status;
			if (lastSeen !== undefined) chat.contactLastSeenAt = lastSeen;
			if (displayName) chat.name = displayName;
			if (avatar !== undefined) chat.avatar = avatar;
		}
		const active = this.#activeChat?.contactUserId === userId ? this.#activeChat : null;
		if (active) {
			if (status != null) active.contactStatusText = status;
			if (lastSeen !== undefined) active.contactLastSeenAt = lastSeen;
			if (displayName) active.name = displayName;
			if (avatar !== undefined) active.avatar = avatar;
		}
		this.#renderChatList();
		if (active?.id) {
			this.#refreshDirectChatHeaderSub(active);
			if (avatar !== undefined) this.#refreshDirectChatHeaderAvatar(active, avatar);
		}
		if (avatar !== undefined) {
			this.#refreshSenderAvatarsInPanels(userId, avatar);
		}
	}

	#refreshDirectChatHeaderAvatar(chat, avatarUrl) {
		if (!chat || this.#activeState?.chatId !== chat.id) return;
		const info = this.#activeState.el?.querySelector('.mc-header-info');
		const scope = info?.querySelector('.mc-header-profile-hit') || info;
		const oldAv = scope?.querySelector('.mc-avatar-wrap, .mc-avatar');
		if (!oldAv || !this.#avatarBuilder) return;
		const displayName = chat.name || '';
		const canShow = this.#canShowContactPresence();
		const presence = canShow && chat.type === 'direct' && chat.contactUserId
			? this.#presence?.get(chat.contactUserId)
			: null;
		const next = presence === 'online' || presence === 'idle'
			? this.#avatarBuilder.buildWithPresence(chat.id, displayName, avatarUrl || null, 32, presence)
			: this.#avatarBuilder.build(chat.id, displayName, avatarUrl || null, 32);
		oldAv.replaceWith(next);
	}

	#refreshSenderAvatarsInPanels(userId, avatarUrl) {
		const patchState = (state) => {
			if (!state?.avatarCache || !userId) return;
			if (avatarUrl) state.avatarCache.set(userId, avatarUrl);
			else state.avatarCache.delete(userId);
			state.msgArea?.querySelectorAll(`[data-sender-id="${userId}"]`).forEach(row => {
				const avWrap = row.querySelector('.mc-avatar');
				if (!avWrap) return;
				if (avatarUrl) {
					let img = avWrap.querySelector('.mc-avatar-img');
					if (img) {
						img.src = avatarUrl;
						return;
					}
					avWrap.innerHTML = '';
					img = document.createElement('img');
					img.className = 'mc-avatar-img';
					img.src = avatarUrl;
					avWrap.appendChild(img);
				}
			});
		};
		if (this.#activeState) patchState(this.#activeState);
		for (const { state } of this.#panelPool.values()) patchState(state);
	}

	#refreshDirectChatHeaderSub(chat) {
		if (!chat || chat.type !== 'direct' || this.#activeState?.chatId !== chat.id) return;
		const subEl = this.#activeState.el?.querySelector('.mc-header-sub');
		if (!subEl) return;
		const canShow = this.#canShowContactPresence();
		const presence = canShow && chat.contactUserId ? this.#presence?.get(chat.contactUserId) : null;
		const text = MessengerUtils.getDirectChatHeaderSub(
			chat, presence, this.#i18n, this.#utils, canShow
		);
		subEl.textContent = text ?? (this.#i18n.t('typeLabels')?.direct || '');
	}

	updateChatMeta(chatId, { name, avatar, contactStatusText, requiresCustomGroupPassword } = {}) {
		const c = this.#chats.find(x => x.id === chatId);
		if (c) {
			if (name != null) c.name = name;
			if (avatar !== undefined) c.avatar = avatar;
			if (requiresCustomGroupPassword != null) {
				c.requiresCustomGroupPassword = !!requiresCustomGroupPassword;
			}
			if (contactStatusText !== undefined && c.type === 'direct') {
				c.contactStatusText = contactStatusText;
			}
		}
		if (this.#activeChat?.id === chatId) {
			if (name != null) this.#activeChat.name = name;
			if (avatar !== undefined) this.#activeChat.avatar = avatar;
			if (requiresCustomGroupPassword != null) {
				this.#activeChat.requiresCustomGroupPassword = !!requiresCustomGroupPassword;
			}
			if (contactStatusText !== undefined && this.#activeChat.type === 'direct') {
				this.#activeChat.contactStatusText = contactStatusText;
			}
		}
		this.#renderChatList();
		if (this.#activeState?.chatId === chatId) {
			const headerName = this.#activeState.el?.querySelector('.mc-header-name');
			if (headerName && name != null) headerName.textContent = name;
			if (contactStatusText !== undefined && this.#activeChat?.type === 'direct') {
				this.#refreshDirectChatHeaderSub(this.#activeChat);
			}
			if (avatar !== undefined) {
				const info = this.#activeState.el?.querySelector('.mc-header-info');
				const scope = info?.querySelector('.mc-header-profile-hit') || info;
				const oldAv = scope?.querySelector('.mc-avatar-wrap, .mc-avatar');
				if (oldAv && this.#activeChat) {
					const chat = this.#activeChat;
					const displayName = chat.name || '';
					const canShow = this.#canShowContactPresence();
					const presence = canShow && chat.type === 'direct' && chat.contactUserId
						? this.#presence?.get(chat.contactUserId)
						: null;
					const next = presence === 'online' || presence === 'idle'
						? this.#avatarBuilder.buildWithPresence(chat.id, displayName, avatar, 32, presence)
						: this.#avatarBuilder.build(chat.id, displayName, avatar, 32);
					oldAv.replaceWith(next);
				}
			}
		}
	}

	async #showContactProfile(chat) {
		if (this.#isGroupChat(chat)) {
			return this.#showGroupProfile(chat);
		}
		const contactUserId = chat?.contactUserId;
		if (!contactUserId) return;
		try {
			const profile = await this.#api.getContactProfile(contactUserId);
			this.#openProfileModal(profile, {
				writeBtn: false,
				fallbackName: chat.name,
				fallbackAvatar: chat.avatar,
			});
		} catch (e) {
			console.warn('[MessengerAppView] showContactProfile error', e);
		}
	}

	async #openProfileByLogin(login) {
		try {
			const profile = await this.#api.getContactByLogin(login);
			if (profile.loginChanged && profile.previousLogin && profile.login) {
				MessengerDialog.showNotice(
					this.#i18n.t('loginChangedRedirect', profile.previousLogin, profile.login),
					this.#i18n.t('confirm'),
					null,
					this.#themeManager
				);
				const nextUrl = buildUserProfileUrl(profile.login);
				if (nextUrl) history.replaceState(null, '', nextUrl);
			}
			if (profile.id && profile.login) this.#contactLogins.set(profile.id, profile.login);
			this.#openProfileModal(profile, {
				writeBtn: true,
				onWrite: async () => {
					const chat = await this.#api.createDirectChat(profile.id);
					this.#onChatCreated({
						...chat,
						contactUserId: profile.id,
						contactStatusText: profile.statusText || '',
						contactLastSeenAt: profile.lastSeenAt ? new Date(profile.lastSeenAt) : null,
						avatar: profile.avatar || chat.avatar,
					});
				},
			});
			normalizeAppUrl();
		} catch (e) {
			console.warn('[MessengerAppView] openProfileByLogin error', e);
		}
	}

	#openProfileModal(profile, { writeBtn = false, onWrite = null, fallbackName = '', fallbackAvatar = null } = {}) {
		lockAppScroll();
		const overlay = this.#utils.mk('div', 'mapp-modal-overlay');
		const close = messengerMakeDismissable(() => {
			unlockAppScroll();
			overlay.remove();
		}, null);
		const modal = this.#utils.mk('div', 'mapp-modal mapp-contact-profile-modal');
		this.#themeManager.applyChatVars(modal);
		this.#themeManager.applyAppVars(modal);
		const header = this.#utils.mk('div', 'mapp-modal-header');
		const titleRow = this.#utils.mk('div', 'mapp-modal-title-row');
		const profileLink = buildUserProfileUrl(profile.login);
		const qrBtn = createProfileQrButton({
			link: profileLink,
			qrTitle: this.#i18n.t('qrProfileTitle'),
			icons: this.#icons,
			i18n: this.#i18n,
			themeManager: this.#themeManager,
			className: 'mapp-modal-qr-btn',
		});
		const title = this.#utils.mk('div', 'mapp-modal-title');
		title.textContent = this.#i18n.t('showProfile');
		if (qrBtn) titleRow.appendChild(qrBtn);
		titleRow.appendChild(title);
		const closeBtn = this.#utils.mk('button', 'mapp-modal-close');
		closeBtn.innerHTML = '×';
		closeBtn.addEventListener('click', () => close());
		header.append(titleRow, closeBtn);
		overlay.addEventListener('click', e => { if (e.target === overlay) close(); });

		const body = this.#utils.mk('div', 'mapp-contact-profile-body');
		const avatarWrap = this.#utils.mk('div', 'mapp-contact-profile-avatar-wrap');
		const avatarUrl = profile.avatar || fallbackAvatar || null;
		avatarWrap.appendChild(this.#avatarBuilder.build(
			profile.id, profile.displayName || fallbackName, avatarUrl, 72
		));
		if (avatarUrl) {
			avatarWrap.classList.add('mapp-contact-profile-avatar-wrap--photo');
			avatarWrap.addEventListener('click', () => MessengerImageViewer.open(avatarUrl, this.#icons));
		}
		const nameEl = this.#utils.mk('div', 'mapp-contact-profile-name mapp-selectable-text');
		nameEl.textContent = profile.displayName || fallbackName || '';
		const loginEl = this.#utils.mk('div', 'mapp-contact-profile-login mapp-selectable-text');
		loginEl.textContent = '@' + (profile.login || '');
		const statusEl = this.#utils.mk('div', 'mapp-contact-profile-status');
		if (profile.statusText) statusEl.textContent = profile.statusText;
		else if (profile.onlineStatus === 'online') statusEl.textContent = this.#i18n.t('onlineNow');
		else if (profile.onlineStatus === 'idle') statusEl.textContent = this.#i18n.t('idleNow');
		else if (profile.lastSeenAt) statusEl.textContent = `${this.#i18n.t('lastSeen')}: ${this.#utils.formatListTime(profile.lastSeenAt)}`;
		else statusEl.textContent = this.#i18n.t('lastSeenNever');
		body.append(avatarWrap, nameEl, loginEl, statusEl);
		const aboutTrim = (profile.aboutText || '').trim();
		if (aboutTrim) {
			const aboutEl = this.#utils.mk('div', 'mapp-contact-profile-about mapp-selectable-text');
			aboutEl.textContent = aboutTrim;
			body.appendChild(aboutEl);
		}

		if (writeBtn && profile.canWrite !== false) {
			const footer = this.#utils.mk('div', 'mapp-modal-footer');
			const writeBtnEl = this.#utils.mk('button', 'mapp-btn mapp-btn-primary mapp-modal-footer-btn');
			writeBtnEl.type = 'button';
			writeBtnEl.textContent = this.#i18n.t('writeMessageBtn');
			writeBtnEl.addEventListener('click', async () => {
				close();
				await onWrite?.();
			});
			footer.appendChild(writeBtnEl);
			modal.append(header, body, footer);
		} else {
			modal.append(header, body);
		}

		overlay.appendChild(modal);
		document.body.appendChild(overlay);
	}

	async #clearChatHistory(chat) {
		const isGroup = chat.type === 'group' || chat.type === 'public_group';
		const isDirect = chat.type === 'direct';

		let alsoDeleteForOther = false;
		if (isDirect) {
			const result = await MessengerDialog.confirmWithCheckbox({
				title: this.#i18n.t('clearHistoryTitle'),
				message: this.#i18n.t('clearHistoryMsg'),
				type: MessengerDialog.TYPE_WARNING,
				confirmLabel: this.#i18n.t('confirm'),
				cancelLabel: this.#i18n.t('cancel'),
				checkboxLabel: this.#i18n.t('alsoDeleteFor', chat.name || ''),
				themeManager: this.#themeManager,
			});
			if (!result) return;
			alsoDeleteForOther = !!result.checked;
		} else {
			const confirmed = await MessengerDialog.confirm({
				title: this.#i18n.t('clearHistoryTitle'),
				message: this.#i18n.t('clearHistoryMsg'),
				type: MessengerDialog.TYPE_WARNING,
				confirmLabel: this.#i18n.t('confirm'),
				cancelLabel: this.#i18n.t('cancel'),
				themeManager: this.#themeManager,
			});
			if (!confirmed) return;
		}

		try {
			await this.#api.clearChatHistory(chat.id, alsoDeleteForOther);
			await this.#onClearChatCache?.(chat.id);
			this.handleHistoryCleared(chat.id);
		} catch (e) {
			console.warn('[MessengerAppView] clearChatHistory error', e);
		}
	}

	handleHistoryCleared(chatId) {
		this.#evictPanel(chatId);
		if (this.#activeChat?.id === chatId) {
			this.el.empty.hidden = false;
			this.#activeChat = null;
			this.#sidebar.setActiveItem(null);
		}
		const c = this.#chats.find(x => x.id === chatId);
		if (c) { c.lastMessage = ''; c.lastMessageTime = null; }
		this.#renderChatList();
	}

	async removeChat(chatId, { showMobileList = false, clearCache = true } = {}) {
		if (!chatId) return;
		if (clearCache) {
			try {
				await this.#onClearChatCache?.(chatId);
			} catch (e) {
				console.warn('[MessengerAppView] removeChat cache clear', e);
			}
		}
		this.#evictPanel(chatId);
		if (this.#activeChat?.id === chatId) {
			if (this.#activeState) {
				this.el.empty.hidden = false;
			}
			this.#activeChat = null;
			this.#sidebar.setActiveItem(null);
		}
		this.#chats = this.#chats.filter(c => c.id !== chatId);
		this.#renderChatList();
		this.#groupProfileModal?.close?.();
		if (showMobileList && MessengerUtils.isMobile()) {
			this.#showChatListMobile();
		}
	}

	async #blockUser(chat) {
		const contactUserId = chat?.contactUserId;
		if (!contactUserId) return;
		const confirmed = await MessengerDialog.confirm({
			title: this.#i18n.t('blockUserTitle'),
			message: this.#i18n.t('blockUserMsg'),
			type: MessengerDialog.TYPE_DANGER,
			confirmLabel: this.#i18n.t('confirm'),
			cancelLabel: this.#i18n.t('cancel'),
			themeManager: this.#themeManager,
		});
		if (!confirmed) return;
		try {
			await this.#api.blockUser(contactUserId);
			await this.removeChat(chat.id, { showMobileList: true, clearCache: true });
		} catch (e) {
			console.warn('[MessengerAppView] blockUser error', e);
		}
	}

	async #blockGroup(chat) {
		if (!chat?.id) return;
		const confirmed = await MessengerDialog.confirm({
			title: this.#i18n.t('blockGroupTitle'),
			message: this.#i18n.t('blockGroupMsg'),
			type: MessengerDialog.TYPE_DANGER,
			confirmLabel: this.#i18n.t('confirm'),
			cancelLabel: this.#i18n.t('cancel'),
			themeManager: this.#themeManager,
		});
		if (!confirmed) return;
		try {
			await this.#api.blockGroup(chat.id);
			await this.removeChat(chat.id, { showMobileList: true, clearCache: true });
		} catch (e) {
			console.warn('[MessengerAppView] blockGroup error', e);
		}
	}

	async #deleteOrLeaveChat(chat, isGroup) {
		const title = isGroup ? this.#i18n.t('leaveGroupTitle') : this.#i18n.t('deleteChatTitle');
		const msg = isGroup ? this.#i18n.t('leaveGroupMsg') : this.#i18n.t('deleteChatMsg');
		const confirmed = await MessengerDialog.confirm({
			title,
			message: msg,
			type: MessengerDialog.TYPE_DANGER,
			confirmLabel: this.#i18n.t('confirm'),
			cancelLabel: this.#i18n.t('cancel'),
			themeManager: this.#themeManager,
		});
		if (!confirmed) return;
		try {
			await this.#api.leaveChat(chat.id);
			await this.removeChat(chat.id, { showMobileList: true, clearCache: true });
		} catch (e) {
			console.warn('[MessengerAppView] deleteOrLeaveChat error', e);
		}
	}
	async #moveChatToFolder(chat, folderId) {
		try {
			if (this.#sidebar.isChatInFolder(chat.id, folderId)) {
				await this.#api.removeChatFromFolder(chat.id, folderId);
			} else {
				await this.#api.setChatFolder(chat.id, folderId);
			}
			await this.#loadFolders();
			this.#renderChatList();
		} catch (e) {
			console.warn('[MessengerAppView] moveChatToFolder error', e);
		}
	}

	promptCreateFolder(chatToAdd = null) {
		return this.#createFolder(chatToAdd);
	}

	async #createFolder(chatToAdd) {
		return new Promise((resolve) => {
			const overlay = this.#utils.mk('div', 'mapp-modal-overlay');
			const modal = this.#utils.mk('div', 'mapp-modal mapp-modal--narrow');
			this.#themeManager.applyChatVars(modal);
			this.#themeManager.applyAppVars(modal);

			const finish = (result) => {
				overlay.remove();
				resolve(result);
			};

			const header = this.#utils.mk('div', 'mapp-modal-header');
			const title = this.#utils.mk('div', 'mapp-modal-title');
			title.textContent = this.#i18n.t('createFolderTitle');
			const closeBtn = this.#utils.mk('button', 'mapp-modal-close');
			closeBtn.innerHTML = '×';
			closeBtn.addEventListener('click', () => finish(null));
			header.append(title, closeBtn);
			overlay.addEventListener('click', e => { if (e.target === overlay) finish(null); });

			const body = this.#utils.mk('div', 'mapp-modal-group-name-wrap mapp-modal-body-pad');
			const nameInput = document.createElement('input');
			nameInput.type = 'text';
			applyStandardFieldInput(nameInput);
			nameInput.placeholder = this.#i18n.t('folderNamePlaceholder');
			nameInput.maxLength = 50;

			const iconChooser = buildFolderIconChooseRow({
				utils: this.#utils,
				icons: this.#icons,
				i18n: this.#i18n,
				themeManager: this.#themeManager,
				value: '',
			});

			body.append(nameInput, iconChooser.row);

			const footer = this.#utils.mk('div', 'mapp-modal-footer mapp-profile-tab-footer');
			const okBtn = this.#utils.mk('button', 'mapp-btn mapp-btn-primary mapp-modal-footer-btn');
			okBtn.textContent = 'OK';
			okBtn.addEventListener('click', async () => {
				const name = nameInput.value.trim();
				if (!name) return;
				try {
					const { folderId } = await this.#api.saveFolder(name, iconChooser.getValue());
					if (chatToAdd && folderId) {
						await this.#api.setChatFolder(chatToAdd.id, folderId);
					}
					await this.#loadFolders();
					this.#renderChatList();
					finish({ folderId });
				} catch (e) {
					console.warn('[MessengerAppView] createFolder error', e);
				}
			});
			footer.appendChild(okBtn);

			modal.append(header, body, footer);
			overlay.appendChild(modal);
			document.body.appendChild(overlay);
			nameInput.focus();
		});
	}

	async #loadFolders() {
		try {
			const { folders, members } = await this.#api.getFolders();
			this.#sidebar.setFolders(folders, members);
		} catch (e) {
			console.warn('[MessengerAppView] loadFolders error', e);
			this.#sidebar.setFolders([], []);
		}
	}

	loadFolders() {
		return this.#loadFolders();
	}

	openArchiveFolder() {
		this.#settingsModal?.close?.();
		this.#sidebar.openArchiveFolder();
	}

	openProfileByLogin(login) {
		return this.#openProfileByLogin(login);
	}

	async openGroupByChatId(chatId) {
		if (!chatId) return;
		const existing = this.#chats.find(c => c.id === chatId);
		if (existing) {
			await this.#showGroupProfile(existing);
			return;
		}
		try {
			const preview = await this.#api.getGroupLinkPreview(chatId);
			if (!preview?.success) return;
			if (preview.isMember) {
				const chat = {
					id: chatId,
					name: preview.name || '',
					type: 'group',
					avatar: preview.avatar || null,
				};
				if (!this.#chats.find(c => c.id === chatId)) {
					this.#chats.push({
						...chat,
						lastMessage: '',
						lastMessageTime: null,
						unreadCount: 0,
					});
					this.#renderChatList();
				}
				await this.#showGroupProfile(chat);
				return;
			}
			if (preview.excludedFromGroup) {
				normalizeAppUrl();
				await MessengerDialog.alert({
					title: this.#i18n.t('groupJoinTitle'),
					message: this.#i18n.t('groupExcludedFromJoin'),
					type: MessengerDialog.TYPE_INFO,
					themeManager: this.#themeManager,
				});
				return;
			}
			if (preview.canJoin) {
				normalizeAppUrl();
				await this.#openGroupJoinModal(preview);
				return;
			}
			normalizeAppUrl();
			await MessengerDialog.alert({
				title: this.#i18n.t('groupProfile'),
				message: this.#i18n.t('groupJoinDisabled'),
				type: MessengerDialog.TYPE_INFO,
				themeManager: this.#themeManager,
			});
		} catch (e) {
			console.warn('[MessengerAppView] openGroupByChatId error', e);
		}
	}

	async #openGroupJoinModal(preview) {
		lockAppScroll();
		const overlay = this.#utils.mk('div', 'mapp-modal-overlay');
		const close = () => { unlockAppScroll(); overlay.remove(); };
		const modal = this.#utils.mk('div', 'mapp-modal mapp-contact-profile-modal');
		this.#themeManager.applyChatVars(modal);
		this.#themeManager.applyAppVars(modal);
		const header = this.#utils.mk('div', 'mapp-modal-header');
		const title = this.#utils.mk('div', 'mapp-modal-title');
		title.textContent = this.#i18n.t('groupJoinTitle');
		const closeBtn = this.#utils.mk('button', 'mapp-modal-close');
		closeBtn.innerHTML = '×';
		closeBtn.addEventListener('click', close);
		header.append(title, closeBtn);
		overlay.addEventListener('click', e => { if (e.target === overlay) close(); });

		const body = this.#utils.mk('div', 'mapp-contact-profile-body');
		const avatarWrap = this.#utils.mk('div', 'mapp-contact-profile-avatar-wrap');
		avatarWrap.appendChild(this.#avatarBuilder.build(
			preview.chatId, preview.name || '', preview.avatar || null, 72
		));
		const nameEl = this.#utils.mk('div', 'mapp-contact-profile-name mapp-selectable-text');
		nameEl.textContent = preview.name || '';
		body.append(avatarWrap, nameEl);

		const footer = this.#utils.mk('div', 'mapp-modal-footer');
		const joinBtn = this.#utils.mk('button', 'mapp-btn mapp-btn-primary mapp-modal-footer-btn');
		joinBtn.type = 'button';
		joinBtn.textContent = this.#i18n.t('groupJoinBtn');
		joinBtn.addEventListener('click', async () => {
			joinBtn.disabled = true;
			try {
				const result = await this.#api.joinGroupByLink(preview.chatId);
				close();
				const chat = {
					id: result.chatId || preview.chatId,
					name: result.chatName || preview.name || '',
					type: 'group',
					avatar: preview.avatar || null,
					lastMessage: '',
					lastMessageTime: null,
					unreadCount: 0,
				};
				this.#onChatCreated(chat);
			} catch (e) {
				joinBtn.disabled = false;
				await MessengerDialog.alert({
					title: this.#i18n.t('groupJoinTitle'),
					message: e.message || '',
					type: MessengerDialog.TYPE_DANGER,
					themeManager: this.#themeManager,
				});
			}
		});
		footer.appendChild(joinBtn);
		modal.append(header, body, footer);
		overlay.appendChild(modal);
		document.body.appendChild(overlay);
	}

	async #bumpChatPreview(chatId, msgOrText, timestamp) {
		const chat = this.#chats.find(c => c.id === chatId);
		if (!chat) return;
		await this.#setChatListPreview(chat, chatId, msgOrText, timestamp);
		this.#renderChatList();
	}

	#isMessageAlreadyInPanel(state, msgId) {
		if (state?.renderedIds?.has(msgId)) return true;
		if (state?.msgArea?.querySelector(`[data-msg-id="${msgId}"]`)) return true;
		for (const entry of state.messages.values()) {
			const d = entry.data;
			if (d?.isVirtual) continue;
			if (d.id === msgId || d.serverId === msgId) return true;
		}
		return false;
	}

	receiveMessage(chatId, msg, listPreviewSource = null) {
		const meId = this.#currentUser?.id;
		if (meId && msg.senderId === meId) msg.isOwn = true;
		this.#markPanelStale(chatId);
		const isChatVisible = this.#isChatVisible(chatId);
		if (isChatVisible && this.#activeState && !this.#isMessageAlreadyInPanel(this.#activeState, msg.id)) {
			this.#panelFactory.appendMsg(this.#activeState, msg);
		}
		const chat = this.#chats.find(c => c.id === chatId);
		if (chat) {
			if (!isChatVisible) {
				if (!msg.isOwn) {
					chat.unreadCount = (chat.unreadCount || 0) + 1;
					this.#sidebar.updateUnreadBadge(chatId, chat.unreadCount, this.#chats);
				}
			} else {
				this.markReadIfEngaged(chatId);
			}
			this.#setChatListPreview(chat, chatId, listPreviewSource || msg, msg.timestamp)
				.then(() => this.#renderChatList())
				.catch(e => console.warn('[MessengerAppView] receiveMessage preview', e));
		}
	}
	#forEachPanelState(chatId, fn) {
		if (this.#activeState?.chatId === chatId) fn(this.#activeState);
		const pooled = this.#panelPool.get(chatId);
		if (pooled) fn(pooled.state);
	}

	updateMessageStatus(messageId, status) {
		if (this.#activeState) {
			this.#panelFactory.updateMsgStatus(this.#activeState, messageId, status);
		}
		for (const { state } of this.#panelPool.values()) {
			this.#panelFactory.updateMsgStatus(state, messageId, status);
		}
	}
	syncMessageStatusInCache(messageId, status) {
		if (this.#activeState) {
			return this.#panelFactory.persistMessageStatus(this.#activeState, messageId, status);
		}
		return Promise.resolve();
	}
	deleteMessage(chatId, storedId, originalId) {
		this.#markPanelStale(chatId);
		this.#forEachPanelState(chatId, state => {
			this.#panelFactory.deleteMessage(state, storedId, originalId);
		});
		this.refreshChatListPreview(chatId).catch(() => {});
	}
	applyMessageUpdated(chatId, payload) {
		this.#markPanelStale(chatId);
		this.#forEachPanelState(chatId, (state) => {
			this.#panelFactory.applyMessageUpdated(state, payload);
		});
		if (payload?.deletedForEveryone) {
			this.refreshChatListPreview(chatId).catch(() => {});
		}
	}
	applyMessageDeletedForEveryone(chatId, messageId) {
		this.deleteMessage(chatId, messageId, messageId);
	}
	async syncAfterReconnect(msgService, api) {
		try {
			const chats = await api.getChats();
			this.setChats(chats);
		} catch (e) {
			console.warn('[MessengerAppView] syncAfterReconnect getChats', e);
		}
		for (const chat of this.#chats) {
			try {
				const { messages, reconcile } = await msgService.syncChatAfterOffline(chat.id, api);
				for (const msg of messages) {
					this.receiveMessage(chat.id, msg);
				}
				if (reconcile?.historyCleared) {
					this.handleHistoryCleared(chat.id);
					continue;
				}
				for (const id of reconcile?.removedIds || []) {
					this.deleteMessage(chat.id, id, id);
				}
			} catch (e) {
				console.warn('[MessengerAppView] syncAfterReconnect chat', chat.id, e);
			}
		}
		for (const chat of this.#chats) {
			await this.refreshChatListPreview(chat.id).catch(() => {});
		}
		if (this.#activeState && this.#isChatVisible(this.#activeState.chatId)) {
			await this.#panelFactory.syncPanelMessages(
				this.#activeState.chatId,
				this.#activeState
			);
			this.markReadIfEngaged(this.#activeState.chatId);
		}
	}
	receiveActivity(chatId, userId, userName, activityType, active) {
		this.#forEachPanelState(chatId, state => {
			this.#panelFactory.updateActivity(state, userId, userName, activityType, active);
		});
	}
	addChat(chat) {
		if (!this.#chats.find(c => c.id === chat.id)) {
			this.#chats.unshift(chat);
			this.#renderChatList();
		}
	}
	async reloadAllChats() {
		this.#clearPanelPool();
		this.#activeChat = null;
		this.el.empty.hidden = false;
		this.el.chatArea?.querySelectorAll('.mapp-chat-panel').forEach(p => p.remove());
		this.el.panelPoolHost?.replaceChildren();
		if (MessengerUtils.isMobile()) {
			this.#showChatListMobile();
		}
		try {
			const chats = await this.#api.getChats();
			this.setChats(chats);
		} catch (e) {
			console.warn('[MessengerAppView] reloadAllChats error:', e);
		}
		this.#persistNavState();
	}
}

class MessengerApiClient {
	static SERVICE_NAME = 'SupraMessenger';
	static RECONCILE_COUNT = 50;

	#crypto = null;
	#currentUserId = null;
	#chatsMeta = new Map();
	/** chatId → { hasKey, checkedAt } — не дергаем /group-keys на каждое сообщение */
	#chatKeyStatus = new Map();
	#distributeLastAt = new Map();
	#distributeInFlight = new Map();
	static DISTRIBUTE_COOLDOWN_MS = 5 * 60 * 1000;

	setCrypto(crypto) {
		this.#crypto = crypto;
	}

	getCrypto() {
		return this.#crypto;
	}

	setCurrentUserId(userId) {
		this.#currentUserId = userId;
	}

	#mapChatDto(c) {
		return {
			id: c.id,
			name: c.name,
			type: c.type,
			avatar: c.avatar || null,
			contactUserId: c.contactUserId || null,
			contactStatusText: c.contactStatusText || '',
			contactLastSeenAt: c.contactLastSeenAt ? new Date(c.contactLastSeenAt) : null,
			lastMessage: c.lastMessage || '',
			lastMessageTime: c.lastMessageTime ? new Date(c.lastMessageTime) : null,
			unreadCount: c.unreadCount || 0,
			requiresCustomGroupPassword: !!c.requiresCustomGroupPassword,
			hasGroupAutoKey: !!c.hasGroupAutoKey,
		};
	}

	#updateChatsMeta(chats) {
		this.#chatsMeta.clear();
		for (const c of chats) this.#chatsMeta.set(c.id, c);
	}

	chatMeta(chatId) {
		return this.#chatsMeta.get(chatId) || null;
	}

	async #chatKeyFor(chatOrId) {
		if (!this.#crypto) return null;
		const chat = typeof chatOrId === 'string' ? this.#chatsMeta.get(chatOrId) : chatOrId;
		if (!chat) return null;
		return this.#crypto.getChatKey(chat, { fetchWrapped: true });
	}

	#withBasicTierMark(m, chat, tier) {
		if (!m || tier !== 'basic' || !chat) return m;
		const hasExtraMode = !!chat.requiresCustomGroupPassword || !!this.#crypto?.getCustomPassword(chat.id);
		return hasExtraMode ? { ...m, _basicTierMark: true } : m;
	}

	#captureEncFields(m) {
		const encText = SupraCrypto.isEncrypted(m.text) ? m.text : (m._encText || null);
		const encReply = m.replyToTextPreview && SupraCrypto.isEncrypted(m.replyToTextPreview)
			? m.replyToTextPreview
			: (m._encReplyPreview || null);
		return { encText, encReply };
	}

	#attachEncFields(m, encText, encReply) {
		const out = { ...m };
		if (encText) out._encText = encText;
		if (encReply) out._encReplyPreview = encReply;
		return out;
	}

	mapCachedMessages(chatId, messages) {
		if (!messages?.length) return messages || [];
		return messages.map(m => this.mapCachedMessage(chatId, m));
	}

	mapCachedMessage(chatId, m) {
		if (!m || m.isVirtual) return m;
		const tier = (m.encryptionTier || 'basic').toLowerCase();
		if (tier !== 'protected') return m;
		const encText = SupraCrypto.isEncrypted(m.text) ? m.text : m._encText;
		if (!encText) return m;
		const encReply = m.replyToTextPreview && SupraCrypto.isEncrypted(m.replyToTextPreview)
			? m.replyToTextPreview
			: m._encReplyPreview;
		return this.#attachEncFields({
			...m,
			text: SupraCrypto.LOCKED_PREVIEW,
			replyToTextPreview: encReply ? SupraCrypto.LOCKED_PREVIEW : null,
			_locked: true,
		}, encText, encReply ?? null);
	}

	async prepareMessagesForCache(chatId, messages) {
		if (!messages?.length) return messages || [];
		const chat = this.#chatsMeta.get(chatId);
		let keysEnsured = false;
		const out = [];
		for (const m of messages) {
			const tier = (m.encryptionTier || 'basic').toLowerCase();
			if (tier === 'protected') {
				const encText = m._encText || (SupraCrypto.isEncrypted(m.text) ? m.text : null);
				const encReply = m._encReplyPreview
					|| (m.replyToTextPreview && SupraCrypto.isEncrypted(m.replyToTextPreview)
						? m.replyToTextPreview
						: null);
				out.push({
					...m,
					text: encText || m.text,
					replyToTextPreview: encReply,
					_encText: encText,
					_encReplyPreview: encReply,
				});
				continue;
			}
			if (SupraCrypto.isEncrypted(m.text) && chat && this.#crypto) {
				if (!keysEnsured) {
					try {
						await this.ensureChatEncryptionKeys(chat, { distribute: false });
					} catch (e) {
						console.warn('[MessengerApiClient] prepareMessagesForCache ensureChatEncryptionKeys', e);
					}
					keysEnsured = true;
				}
				out.push(await this.#decryptMessageFields(m, chatId));
			} else {
				out.push(m);
			}
		}
		return out;
	}

	chatUsesExtraPasswordMode(chatId) {
		const chat = this.#chatsMeta.get(chatId);
		if (!chat) return !!this.#crypto?.isExtraEncryptionEnabled(chatId);
		const isGroup = chat.type === 'group' || chat.type === 'public_group';
		return !!this.#crypto?.isExtraEncryptionEnabled(chatId)
			|| (isGroup && !!chat.requiresCustomGroupPassword);
	}

	async resolveOutgoingEncryption(chatId, options = {}) {
		const crypto = this.#crypto;
		if (!crypto) return { tier: 'basic' };
		if (crypto.getCustomPassword(chatId)) return { tier: 'protected' };
		if (crypto.isSessionSendBasicOnly(chatId)) return { tier: 'basic' };
		if (!this.chatUsesExtraPasswordMode(chatId)) return { tier: 'basic' };

		const i18n = options.i18n;
		const choice = await MessengerDialog.choose({
			title: i18n?.t('sendExtraPasswordTitle') || 'Доп. пароль',
			message: i18n?.t('sendExtraPasswordMessage')
				|| 'В этом чате используется доп. пароль. Введите его или отправьте сообщение без защиты.',
			primaryLabel: i18n?.t('sendExtraPasswordEnter') || 'Ввести доп. пароль',
			secondaryLabel: i18n?.t('sendExtraPasswordBasic') || 'Отправить без пароля',
			cancelLabel: i18n?.t('cancel') || 'Отмена',
			themeManager: options.themeManager || null,
		});
		if (choice === 'primary') {
			const pwd = await MessengerDialog.promptPassword({
				title: i18n?.t('sendExtraPasswordEnter') || 'Ввести доп. пароль',
				message: i18n?.t('groupCustomPasswordHint') || '',
				placeholder: i18n?.t('groupCustomPasswordPlaceholder') || '',
				minLength: SupraAuthCrypto.GROUP_EXTRA_MIN_LENGTH,
				confirmLabel: i18n?.t('ok') || 'OK',
				cancelLabel: i18n?.t('cancel') || 'Отмена',
				themeManager: options.themeManager || null,
			});
			if (!pwd) return { tier: 'basic', cancelled: true };
			await crypto.setCustomPassword(chatId, pwd);
			crypto.invalidateChatKey(chatId);
			return { tier: 'protected', passwordEntered: true };
		}
		if (choice === 'secondary') {
			crypto.setSessionSendBasicOnly(chatId, true);
			crypto.setExtraEncryptionEnabled(chatId, false);
			return { tier: 'basic' };
		}
		return { tier: 'basic', cancelled: true };
	}

	async prepareOutgoingFields(chatId, text, options = {}) {
		const resolved = options._resolvedTier
			|| await this.resolveOutgoingEncryption(chatId, options);
		if (resolved.cancelled) {
			const err = new Error('send-cancelled');
			err.code = 'send-cancelled';
			throw err;
		}
		const tier = resolved.tier || 'basic';
		if (tier !== 'protected') return { encryptionTier: tier };
		const enc = await this.#encryptOutgoing(chatId, text, options, tier);
		return {
			encryptionTier: tier,
			_encText: enc.text,
			_encReplyPreview: enc.replyToTextPreview,
		};
	}

	async #decryptMessageFields(m, chatId) {
		if (!this.#crypto || !m) return m;
		const chat = this.#chatsMeta.get(chatId);
		if (!chat) return m;
		const { encText, encReply } = this.#captureEncFields(m);
		const tier = (m.encryptionTier || 'basic').toLowerCase();
		const opts = { fetchWrapped: true };
		if (tier === 'protected' && !this.#crypto.getCustomPassword(chatId)) {
			return this.#attachEncFields({
				...m,
				text: SupraCrypto.LOCKED_PREVIEW,
				replyToTextPreview: encReply ? SupraCrypto.LOCKED_PREVIEW : null,
				_locked: true,
				encryptionTier: tier,
			}, encText, encReply);
		}
		let key = null;
		if (tier === 'protected') {
			key = await this.#crypto.getProtectedChatKey(chat, opts);
			if (!key) {
				return this.#attachEncFields({
					...m,
					text: SupraCrypto.LOCKED_PREVIEW,
					replyToTextPreview: encReply ? SupraCrypto.LOCKED_PREVIEW : null,
					_locked: true,
					encryptionTier: tier,
				}, encText, encReply);
			}
		} else {
			key = await this.#crypto.getAutoChatKey(chat, opts);
			if (!key) {
				return { ...m, text: SupraCrypto.LOCKED_PREVIEW, _locked: true, encryptionTier: tier };
			}
		}
		const cipherText = encText || m.text;
		const text = await this.#crypto.decryptText(cipherText, key);
		if (text === SupraCrypto.LOCKED_PREVIEW && tier === 'protected') {
			return this.#attachEncFields({
				...m,
				text: SupraCrypto.LOCKED_PREVIEW,
				replyToTextPreview: encReply ? SupraCrypto.LOCKED_PREVIEW : null,
				_locked: true,
				encryptionTier: tier,
			}, encText, encReply);
		}
		let replyToTextPreview = m.replyToTextPreview;
		const replyCipher = encReply || replyToTextPreview;
		if (replyCipher && SupraCrypto.isEncrypted(replyCipher)) {
			replyToTextPreview = await this.#crypto.decryptText(replyCipher, key);
			if (replyToTextPreview === SupraCrypto.LOCKED_PREVIEW) {
				replyToTextPreview = SupraCrypto.LOCKED_PREVIEW;
			}
		}
		return this.#withBasicTierMark(
			this.#attachEncFields(
				{ ...m, text, replyToTextPreview, encryptionTier: tier, _locked: false },
				encText,
				encReply
			),
			chat,
			tier
		);
	}

	async #encryptOutgoing(chatId, text, options = {}, tierOverride = null) {
		if (!this.#crypto) throw new Error('Мастер-пароль не введён');
		const chat = this.#chatsMeta.get(chatId);
		if (!chat) throw this.#encryptionKeyError('Нет ключа шифрования для чата', 'chat-meta');
		const tier = tierOverride || (this.#crypto.getCustomPassword(chatId) ? 'protected' : 'basic');
		const key = await this.#obtainOutgoingChatKey(chat, tier);
		const encText = await this.#crypto.encryptText(text, key);
		let encPreview = null;
		if (options.replyToTextPreview) {
			encPreview = await this.#crypto.encryptPreview(options.replyToTextPreview, key);
		}
		return { text: encText, replyToTextPreview: encPreview, encryptionTier: tier };
	}

	async #saveGroupKeysWithRetry(chatId, payload, attempts = 4) {
		let lastError = new Error('Не удалось сохранить ключи группы');
		for (let attempt = 0; attempt < attempts; attempt++) {
			const saveRes = await fetch('/api/encryption/group-keys', {
				method: 'POST',
				credentials: 'same-origin',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload),
			});
			if (saveRes.ok) return;
			const j = await saveRes.json().catch(() => ({}));
			lastError = new Error(j.error || 'Не удалось сохранить ключи группы');
			if (attempt < attempts - 1) {
				await new Promise(r => setTimeout(r, 120 * (attempt + 1)));
			}
		}
		throw lastError;
	}

	async #fetchParticipantPublicKeys(userIds) {
		const pubRes = await fetch('/api/encryption/public-keys', {
			method: 'POST',
			credentials: 'same-origin',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ userIds }),
		});
		if (!pubRes.ok) throw new Error('Не удалось получить публичные ключи участников');
		const { keys } = await pubRes.json();
		return keys || {};
	}

	async #setupGroupKeys(chatId, participantIds, { requiresCustomPassword = false, customPassword = null } = {}) {
		if (!this.#crypto || !this.#currentUserId) {
			throw new Error('Сессия шифрования не активна');
		}
		const autoPassword = SupraCrypto.generateGroupAutoPassword();
		const allIds = [this.#currentUserId, ...participantIds.filter(id => id !== this.#currentUserId)];
		await this.#crypto.ensureServerPublicKey();
		let keys = await this.#fetchParticipantPublicKeys(allIds);
		if (!SupraCrypto.lookupPublicKey(keys, this.#currentUserId)) {
			await this.#crypto.ensureServerPublicKey();
			keys = await this.#fetchParticipantPublicKeys(allIds);
		}
		if (!SupraCrypto.lookupPublicKey(keys, this.#currentUserId)) {
			throw new Error(
				'На сервере не сохранён ваш публичный ключ шифрования. Выйдите и войдите снова с мастер-паролем.'
			);
		}
		const selfNorm = SupraCrypto.normalizeUserId(this.#currentUserId);
		const idsWithKeys = allIds.filter(id => SupraCrypto.lookupPublicKey(keys, id));
		const missingOthers = allIds.filter(
			id => !SupraCrypto.lookupPublicKey(keys, id) &&
				SupraCrypto.normalizeUserId(id) !== selfNorm
		);
		const wrapped = await SupraCrypto.wrapAutoPasswordForUsers(autoPassword, idsWithKeys, keys);
		if (!wrapped.length) {
			throw new Error('Не удалось сформировать ключи шифрования для группы');
		}
		await this.#saveGroupKeysWithRetry(chatId, {
			chatId,
			requiresCustomPassword: !!requiresCustomPassword,
			keys: wrapped,
		});
		if (requiresCustomPassword && customPassword) {
			await this.#crypto.setCustomPassword(chatId, customPassword);
		}
		this.#crypto.invalidateChatKey(chatId);
		return { missingCount: missingOthers.length };
	}

	async distributeMissingGroupKeys(chatId, options = {}) {
		if (!this.#crypto || !this.#currentUserId) return;
		const force = !!options.force;
		if (!force) {
			const last = this.#distributeLastAt.get(chatId) || 0;
			if (Date.now() - last < MessengerApiClient.DISTRIBUTE_COOLDOWN_MS) return;
		}
		if (this.#distributeInFlight.has(chatId)) {
			return this.#distributeInFlight.get(chatId);
		}
		const task = this.#distributeMissingGroupKeysInner(chatId)
			.finally(() => {
				this.#distributeInFlight.delete(chatId);
				this.#distributeLastAt.set(chatId, Date.now());
			});
		this.#distributeInFlight.set(chatId, task);
		return task;
	}

	async #distributeMissingGroupKeysInner(chatId) {
		const missRes = await fetch(`/api/encryption/group-keys/${encodeURIComponent(chatId)}/missing`, {
			credentials: 'same-origin',
		});
		if (!missRes.ok) return;
		const { userIds } = await missRes.json();
		if (!userIds?.length) return;
		const myKey = await fetch(`/api/encryption/group-keys/${encodeURIComponent(chatId)}`, {
			credentials: 'same-origin',
		});
		if (!myKey.ok) return;
		const myWrap = await myKey.json();
		if (!myWrap.found) return;
		const autoPassword = await this.#crypto.unwrapGroupAutoPassword(myWrap.wrappedAutoPassword);
		const pubRes = await fetch('/api/encryption/public-keys', {
			method: 'POST',
			credentials: 'same-origin',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ userIds }),
		});
		if (!pubRes.ok) return;
		const { keys } = await pubRes.json();
		const wrapped = await SupraCrypto.wrapAutoPasswordForUsers(autoPassword, userIds, keys);
		if (!wrapped.length) return;
		await fetch('/api/encryption/group-keys', {
			method: 'POST',
			credentials: 'same-origin',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ chatId, keys: wrapped }),
		});
	}

	#encryptionKeyError(message, code) {
		const err = new Error(message);
		err.code = code || 'encryption-key';
		return err;
	}

	#clearChatKeyCaches(chatId) {
		this.#chatKeyStatus.delete(chatId);
		this.#crypto?.invalidateChatKey(chatId);
	}

	async #probeMyWrappedGroupKey(chatId) {
		const r = await fetch(`/api/encryption/group-keys/${encodeURIComponent(chatId)}`, {
			credentials: 'same-origin',
		});
		if (!r.ok) return { found: false, unwrapOk: false };
		const j = await r.json().catch(() => ({}));
		if (!j.found) return { found: false, unwrapOk: false };
		try {
			await this.#crypto.unwrapGroupAutoPassword(j.wrappedAutoPassword);
			return { found: true, unwrapOk: true };
		} catch (e) {
			console.warn('[MessengerApiClient] unwrap group auto password', e);
			return { found: true, unwrapOk: false };
		}
	}

	async #rotateChatEncryptionKeys(chat) {
		const chatId = chat.id;
		const type = (chat.type || '').toLowerCase();
		if (type === 'direct') {
			const otherId = chat.contactUserId;
			if (!otherId) return false;
			await this.#setupGroupKeys(chatId, [otherId]);
		} else if (type === 'group' || type === 'public_group') {
			const info = await this.getGroupInfo(chatId);
			const participantIds = (info.members || [])
				.map(m => m.id)
				.filter(id => id && id !== this.#currentUserId);
			await this.#setupGroupKeys(chatId, participantIds);
		} else {
			return false;
		}
		this.#chatKeyStatus.set(chatId, { hasKey: true, checkedAt: Date.now() });
		chat.hasGroupAutoKey = true;
		const meta = this.#chatsMeta.get(chatId);
		if (meta) meta.hasGroupAutoKey = true;
		this.#crypto.invalidateChatKey(chatId);
		return true;
	}

	async #fetchOutgoingChatKey(chat, tier) {
		const useProtected = tier === 'protected';
		const opts = { fetchWrapped: true };
		return useProtected
			? this.#crypto.getProtectedChatKey(chat, opts)
			: this.#crypto.getAutoChatKey(chat, opts);
	}

	async #reissueChatKeysForSend(chat) {
		const chatId = chat.id;
		this.#clearChatKeyCaches(chatId);
		try {
			await this.ensureChatEncryptionKeys(chat, { distribute: true, force: true });
		} catch (e) {
			console.warn('[MessengerApiClient] ensureChatEncryptionKeys (send)', e);
		}
		try {
			await this.distributeMissingGroupKeys(chatId, { force: true });
		} catch (e) {
			console.warn('[MessengerApiClient] distributeMissingGroupKeys (send)', e);
		}
		let key = await this.#fetchOutgoingChatKey(chat, 'basic');
		if (key) return key;

		const probe = await this.#probeMyWrappedGroupKey(chatId);
		if (!probe.found || !probe.unwrapOk) {
			try {
				const rotated = await this.#rotateChatEncryptionKeys(chat);
				if (rotated) {
					await this.distributeMissingGroupKeys(chatId, { force: true });
				}
			} catch (e) {
				console.warn('[MessengerApiClient] rotateChatEncryptionKeys (send)', e);
			}
		}
		return null;
	}

	async #obtainOutgoingChatKey(chat, tier) {
		const chatId = chat.id;
		if (tier === 'protected' && !this.#crypto.getCustomPassword(chatId)) {
			throw this.#encryptionKeyError(
				'Для отправки нужен доп. пароль чата',
				'need-extra-password'
			);
		}

		let key = await this.#fetchOutgoingChatKey(chat, tier);
		if (key) return key;

		try {
			await this.ensureChatEncryptionKeys(chat, { distribute: true });
		} catch (e) {
			console.warn('[MessengerApiClient] ensureChatEncryptionKeys', e);
		}
		key = await this.#fetchOutgoingChatKey(chat, tier);
		if (key) return key;

		await this.#reissueChatKeysForSend(chat);
		key = await this.#fetchOutgoingChatKey(chat, tier);
		if (key) return key;

		const probe = await this.#probeMyWrappedGroupKey(chatId);
		if (probe.found && !probe.unwrapOk) {
			throw this.#encryptionKeyError(
				'Ключ на сервере не подходит к мастер-паролю',
				'master-mismatch'
			);
		}
		throw this.#encryptionKeyError('Нет ключа шифрования для чата', 'encryption-key-missing');
	}

	/** Создаёт RSA-обёрнутый автоключ, если у текущего пользователя его ещё нет в чате. */
	async ensureChatEncryptionKeys(chat, options = {}) {
		if (!this.#crypto || !this.#currentUserId || !chat?.id) return false;
		const chatId = chat.id;
		const shouldDistribute = options.distribute !== false;
		if (options.force) {
			this.#clearChatKeyCaches(chatId);
		}
		const cached = this.#chatKeyStatus.get(chatId);
		if (cached?.hasKey && !options.force) {
			if (shouldDistribute) await this.distributeMissingGroupKeys(chatId);
			return false;
		}

		const type = (chat.type || '').toLowerCase();
		if (type === 'group' || type === 'public_group') {
			return this.#ensureGroupChatEncryptionKeys(chat, options);
		}
		if (type !== 'direct') return false;

		const myKeyRes = await fetch(`/api/encryption/group-keys/${encodeURIComponent(chatId)}`, {
			credentials: 'same-origin',
		});
		if (myKeyRes.ok) {
			const myKey = await myKeyRes.json();
			if (myKey.found) {
				this.#chatKeyStatus.set(chatId, { hasKey: true, checkedAt: Date.now() });
				if (shouldDistribute) await this.distributeMissingGroupKeys(chatId);
				chat.hasGroupAutoKey = true;
				const meta = this.#chatsMeta.get(chatId);
				if (meta) meta.hasGroupAutoKey = true;
				return false;
			}
		}

		const missRes = await fetch(`/api/encryption/group-keys/${encodeURIComponent(chatId)}/missing`, {
			credentials: 'same-origin',
		});
		if (!missRes.ok) return false;
		const { userIds: missing } = await missRes.json();
		if (!missing?.includes(this.#currentUserId)) return false;

		const otherId = chat.contactUserId;
		if (!otherId) return false;

		await this.#setupGroupKeys(chatId, [otherId]);
		this.#chatKeyStatus.set(chatId, { hasKey: true, checkedAt: Date.now() });
		chat.hasGroupAutoKey = true;
		const meta = this.#chatsMeta.get(chatId);
		if (meta) meta.hasGroupAutoKey = true;
		this.#crypto.invalidateChatKey(chatId);
		return true;
	}

	async #ensureGroupChatEncryptionKeys(chat, options = {}) {
		const chatId = chat.id;
		const shouldDistribute = options.distribute !== false;
		if (options.force) {
			this.#clearChatKeyCaches(chatId);
		}
		const cached = this.#chatKeyStatus.get(chatId);
		if (cached?.hasKey && !options.force) {
			if (shouldDistribute) await this.distributeMissingGroupKeys(chatId);
			return false;
		}

		const myKeyRes = await fetch(`/api/encryption/group-keys/${encodeURIComponent(chatId)}`, {
			credentials: 'same-origin',
		});
		if (myKeyRes.ok) {
			const myKey = await myKeyRes.json();
			if (myKey.found) {
				this.#chatKeyStatus.set(chatId, { hasKey: true, checkedAt: Date.now() });
				if (shouldDistribute) await this.distributeMissingGroupKeys(chatId);
				chat.hasGroupAutoKey = true;
				const meta = this.#chatsMeta.get(chatId);
				if (meta) meta.hasGroupAutoKey = true;
				return false;
			}
		}

		const missRes = await fetch(`/api/encryption/group-keys/${encodeURIComponent(chatId)}/missing`, {
			credentials: 'same-origin',
		});
		if (!missRes.ok) return false;
		const { userIds: missing } = await missRes.json();
		if (!missing?.includes(this.#currentUserId)) return false;

		try {
			const info = await this.getGroupInfo(chatId);
			const participantIds = (info.members || [])
				.map(m => m.id)
				.filter(id => id && id !== this.#currentUserId);
			await this.#setupGroupKeys(chatId, participantIds);
			this.#chatKeyStatus.set(chatId, { hasKey: true, checkedAt: Date.now() });
			chat.hasGroupAutoKey = true;
			const meta = this.#chatsMeta.get(chatId);
			if (meta) meta.hasGroupAutoKey = true;
			this.#crypto.invalidateChatKey(chatId);
			return true;
		} catch (e) {
			console.warn('[MessengerApiClient] ensureGroupChatEncryptionKeys', e);
			return false;
		}
	}

	#getBpmCsrf() {
		return MessengerAppContext.getBpmCsrf();
	}

	async call(methodName, data = {}) {
		const url = MessengerAppContext.toAbsoluteUrl(`/api/messenger/${methodName}`);
		const response = await fetch(url, {
			method: 'POST',
			credentials: 'same-origin',
			headers: {
				'Accept': 'application/json',
				'Content-Type': 'application/json',
				'BPMCSRF': this.#getBpmCsrf(),
			},
			body: JSON.stringify(data),
		});
		if (!response.ok) throw new Error(`HTTP ${response.status}`);
		const json = await response.json();
		const key = `${methodName}Result`;
		if (json[key] && typeof json[key] === 'string') json[key] = JSON.parse(json[key]);
		return json[key] ?? json;
	}

	async getCurrentUser() {
		try {
			const r = await this.call('GetCurrentUser');
			if (r?.success) {
				const u = r.user;
				if (u.id) this.#currentUserId = u.id;
				return {
					id: u.id,
					login: u.login,
					name: u.name,
					avatar: u.avatar || null,
					colorSeed: u.colorSeed || 'default',
					userType: u.userType || 'User',
					statusText: u.statusText || '',
					encryptionConfigured: !!u.encryptionConfigured,
				};
			}
		} catch (e) {
			console.warn('[MessengerApiClient] GetCurrentUser', e);
		}
		return {
			name: '…',
			avatar: null,
			colorSeed: 'default',
			userType: 'User',
		};
	}

	async getChats() {
		const r = await this.call('GetChats');
		if (!r?.success) throw new Error(r?.error || 'GetChats failed');
		const chats = (r.chats || []).map(c => this.#mapChatDto(c));
		this.#updateChatsMeta(chats);
		return chats;
	}

	async getContacts(page = 1, rowCount = 20, searchQuery = '') {
		const r = await this.call('GetContacts', {
			page,
			rowCount,
			searchQuery
		});
		if (!r?.success) throw new Error(r?.error || 'GetContacts failed');
		return (r.contacts || []).map(c => ({
			id: c.id,
			name: c.name,
			avatar: c.avatar || null
		}));
	}

	async getAllContacts(page = 1, rowCount = 50, searchQuery = '') {
		const r = await this.call('GetAllContacts', { page, rowCount, searchQuery });
		if (!r?.success) throw new Error(r?.error || 'GetAllContacts failed');
		return (r.contacts || []).map(c => ({
			id: c.id,
			name: c.name,
			avatar: c.avatar || null
		}));
	}

	/** Contacts from user's chats only (for group member picker). */
	async getChatContacts(page = 1, rowCount = 50, searchQuery = '') {
		const r = await this.call('GetAllContacts', {
			page,
			rowCount,
			searchQuery,
			chatContactsOnly: true,
		});
		if (!r?.success) throw new Error(r?.error || 'GetAllContacts failed');
		return (r.contacts || []).map(c => ({
			id: c.id,
			name: c.name,
			avatar: c.avatar || null
		}));
	}

	async clearChatHistory(chatId, alsoDeleteForOther = false) {
		const r = await this.call('ClearChatHistory', { chatId, alsoDeleteForOther });
		if (!r?.success) throw new Error(r?.error || 'ClearChatHistory failed');
		return r;
	}

	async leaveChat(chatId) {
		const r = await this.call('LeaveChat', { chatId });
		if (!r?.success) throw new Error(r?.error || 'LeaveChat failed');
		return r;
	}

	async getFolders() {
		const r = await this.call('GetFolders', {});
		if (!r?.success) throw new Error(r?.error || 'GetFolders failed');
		return {
			folders: (r.folders || []).map(f => ({
				id: f.id,
				name: f.name,
				icon: f.icon || '',
				order: f.order ?? 0,
				isArchive: !!f.isArchive,
			})),
			members: r.members || [],
		};
	}

	async saveFolder(name, icon = '', folderId = null) {
		const r = await this.call('SaveFolder', { name, icon, folderId });
		if (!r?.success) throw new Error(r?.error || 'SaveFolder failed');
		return r;
	}

	async deleteFolder(folderId) {
		const r = await this.call('DeleteFolder', { folderId });
		if (!r?.success) throw new Error(r?.error || 'DeleteFolder failed');
		return r;
	}

	async setChatFolder(chatId, folderId) {
		const r = await this.call('SetChatFolder', { chatId, folderId });
		if (!r?.success) throw new Error(r?.error || 'SetChatFolder failed');
		return r;
	}

	async removeChatFromFolder(chatId, folderId = null) {
		const r = await this.call('RemoveChatFromFolder', { chatId, folderId });
		if (!r?.success) throw new Error(r?.error || 'RemoveChatFromFolder failed');
		return r;
	}

	async reorderFolders(folderIds) {
		const r = await this.call('ReorderFolders', { folderIds: JSON.stringify(folderIds) });
		if (!r?.success) throw new Error(r?.error || 'ReorderFolders failed');
		return r;
	}

	async getContactProfile(userId) {
		const r = await fetch(`/api/profile/${userId}`, { credentials: 'same-origin' });
		if (!r.ok) throw new Error('HTTP ' + r.status);
		return await r.json();
	}

	async getContactByLogin(login) {
		const r = await fetch(`/api/profile/by-login/${encodeURIComponent(login)}`, { credentials: 'same-origin' });
		if (!r.ok) throw new Error('HTTP ' + r.status);
		return await r.json();
	}

	async getMessages(chatId, offset, count) {
		const r = await this.call('GetMessages', {
			chatId,
			offset,
			count
		});
		if (!r?.success) throw new Error(r?.error || 'GetMessages failed');
		return MessengerUtils.sortMessages(await this.#mapMessages(r.messages, chatId));
	}

	async getMessagesAround(chatId, messageId, before = 25, after = 25) {
		const r = await this.call('GetMessagesAround', {
			chatId,
			messageId,
			before,
			after,
		});
		if (!r?.success) throw new Error(r?.error || 'GetMessagesAround failed');
		return {
			messages: MessengerUtils.sortMessages(await this.#mapMessages(r.messages, chatId)),
			hasMoreBefore: !!r.hasMoreBefore,
			hasMoreAfter: !!r.hasMoreAfter,
		};
	}

	async getNewMessages(chatId, afterMessageId, count = 50) {
		if (!afterMessageId) return this.getMessages(chatId, 0, count);
		try {
			const r = await this.call('GetMessages', {
				chatId,
				afterMessageId,
				count,
				offset: 0,
			});
			if (!r?.success) throw new Error(r?.error || 'GetMessages failed');
			return MessengerUtils.sortMessages(await this.#mapMessages(r.messages, chatId));
		} catch (e) {
			console.warn('[MessengerApiClient] getNewMessages error:', e);
			return [];
		}
	}

	async getMessageSyncIndex(chatId, afterMessageId = null) {
		try {
			const r = await this.call('GetMessageSyncIndex', {
				chatId,
				afterMessageId: afterMessageId || undefined,
			});
			if (!r?.success) throw new Error(r?.error || 'GetMessageSyncIndex failed');
			return (r.entries || []).map(e => ({
				id: e.id,
				timestamp: new Date(e.timestamp),
			}));
		} catch (e) {
			console.warn('[MessengerApiClient] getMessageSyncIndex error:', e);
			return [];
		}
	}

	async #mapMessages(raw = [], chatId = null) {
		const mapped = raw.map(m => ({
			id: m.id,
			senderId: m.senderId,
			senderName: m.senderName,
			senderAvatar: m.senderAvatar || null,
			text: m.text,
			timestamp: new Date(m.timestamp),
			status: m.status || 'read',
			isOwn: !!m.isOwn,
			replyToMessageId: m.replyToMessageId || null,
			replyToSenderName: m.replyToSenderName || null,
			replyToTextPreview: m.replyToTextPreview || null,
			forwardedFromSenderName: m.forwardedFromSenderName || null,
			editedOn: m.editedOn ? new Date(m.editedOn) : null,
			deletedForEveryone: !!m.deletedForEveryone,
			encryptionTier: m.encryptionTier || 'basic',
		}));
		if (!chatId || !this.#crypto) return mapped;
		const out = [];
		for (const m of mapped) out.push(await this.#decryptMessageFields(m, chatId));
		return out;
	}

	async sendMessage(chatId, text, options = {}) {
		const localId = typeof options === 'string' ? options : options?.localId;
		const plainOpts = typeof options === 'object' ? options : {};
		const resolved = plainOpts._resolvedTier
			|| await this.resolveOutgoingEncryption(chatId, plainOpts);
		if (resolved.cancelled) {
			const err = new Error('send-cancelled');
			err.code = 'send-cancelled';
			throw err;
		}
		const enc = await this.#encryptOutgoing(chatId, text, plainOpts, resolved.tier);
		MessengerMessageSounds.playOutgoing();
		const r = await this.call('SendMessage', {
			chatId,
			text: enc.text,
			localId,
			replyToMessageId: plainOpts?.replyToMessageId || null,
			forwardedFromSenderName: plainOpts?.forwardedFromSenderName || null,
			replyToTextPreview: enc.replyToTextPreview,
			encryptionTier: enc.encryptionTier,
		});
		if (!r?.success) throw new Error(r?.error || 'SendMessage failed');
		return {
			id: r.messageId,
			status: r.status || 'sent',
			text,
			timestamp: new Date(),
			isOwn: true,
			encryptionTier: enc.encryptionTier,
			_encText: enc.text,
			_encReplyPreview: enc.replyToTextPreview,
			replyToMessageId: plainOpts?.replyToMessageId || null,
			replyToSenderName: plainOpts?.replyToSenderName || null,
			replyToTextPreview: plainOpts?.replyToTextPreview || null,
			forwardedFromSenderName: plainOpts?.forwardedFromSenderName || null,
		};
	}

	getOutgoingEncryptionTier(chatId) {
		if (this.#crypto?.getCustomPassword(chatId)) return 'protected';
		if (this.#crypto?.isSessionSendBasicOnly(chatId)) return 'basic';
		return 'basic';
	}

	async editMessage(chatId, messageId, text) {
		const enc = await this.#encryptOutgoing(chatId, text, {});
		const r = await this.call('EditMessage', {
			chatId,
			messageId,
			text: enc.text,
			encryptionTier: enc.encryptionTier,
		});
		if (!r?.success) throw new Error(r?.error || 'EditMessage failed');
		return r;
	}

	async deleteMessage(chatId, messageId, deleteForEveryone = false) {
		const r = await this.call('DeleteMessage', { chatId, messageId, deleteForEveryone });
		if (!r?.success) throw new Error(r?.error || 'DeleteMessage failed');
		return r;
	}

	canForwardMessage(msg) {
		if (!msg || msg.deletedForEveryone || msg.isVirtual) return false;
		if (MessengerCustomMessage.isSystemEvent(msg) || MessengerCustomMessage.isDateSeparator(msg)) return false;
		const tier = (msg.encryptionTier || 'basic').toLowerCase();
		if (tier === 'protected') return false;
		if (msg._locked || msg.text === SupraCrypto.LOCKED_PREVIEW || msg.text === SupraCrypto.LOCKED_OTHER) return false;
		if (SupraCrypto.isEncrypted(msg.text)) return false;
		if (!msg.text) return false;
		return true;
	}

	async #resolveForwardTargetChatId(targetId) {
		if (this.#chatsMeta.has(targetId)) return targetId;
		for (const c of this.#chatsMeta.values()) {
			if (c.type === 'direct' && c.contactUserId === targetId) return c.id;
		}
		const chat = await this.createDirectChat(targetId);
		return chat.id;
	}

	async forwardMessage(sourceChatId, messageId, contactIds, sourceMsg = null, options = {}) {
		if (!contactIds?.length) throw new Error('Не выбраны контакты');
		if (contactIds.length > 10) throw new Error('Можно выбрать не более 10 контактов');
		if (!sourceMsg) throw new Error('Сообщение не найдено');

		const display = await this.decryptMessageForDisplay(sourceMsg, sourceChatId);
		if (!this.canForwardMessage(display)) {
			throw new Error(options.i18n?.t('forwardNotAllowed') || 'Нельзя переслать это сообщение');
		}

		const plainText = display.text;
		const forwardFrom = sourceMsg.senderName || display.senderName || '';
		const sentChatIds = [];

		for (const targetId of [...new Set(contactIds)]) {
			let targetChatId;
			try {
				targetChatId = await this.#resolveForwardTargetChatId(targetId);
			} catch (e) {
				console.warn('[MessengerApiClient] forward resolve target', targetId, e);
				continue;
			}
			try {
				await this.sendMessage(targetChatId, plainText, {
					forwardedFromSenderName: forwardFrom,
					i18n: options.i18n,
					themeManager: options.themeManager,
				});
				sentChatIds.push(targetChatId);
			} catch (e) {
				if (e?.code === 'send-cancelled') throw e;
				console.warn('[MessengerApiClient] forward send', targetChatId, e);
			}
		}

		if (!sentChatIds.length) {
			throw new Error(options.i18n?.t('forwardChatsNotFound') || 'Не удалось переслать ни одному контакту');
		}
		return { success: true, sentChatIds };
	}

	async markRead(chatId) {
		try {
			await this.call('MarkMessagesRead', {
				chatId
			});
		} catch (e) {
			console.warn('[MessengerApiClient] MarkRead', e);
		}
	}

	async createDirectChat(contactId) {
		const r = await this.call('CreateDirectChat', {
			contactId
		});
		if (!r?.success) throw new Error(r?.error || 'CreateDirectChat failed');
		const chat = {
			id: r.chatId,
			name: r.chatName,
			type: 'direct',
			avatar: null,
			contactUserId: contactId,
			lastMessage: '',
			lastMessageTime: null,
			unreadCount: 0,
			hasGroupAutoKey: false,
			requiresCustomGroupPassword: false,
		};
		this.#chatsMeta.set(chat.id, chat);
		try {
			await this.#setupGroupKeys(chat.id, [contactId]);
			chat.hasGroupAutoKey = true;
		} catch (e) {
			console.warn('[MessengerApiClient] createDirectChat setup keys', e);
		}
		return chat;
	}

	async createGroup(name, participantContactIds, groupOptions = {}) {
		const r = await this.call('CreateGroup', {
			name,
			participantContactIds: JSON.stringify(participantContactIds),
		});
		if (!r?.success) throw new Error(r?.error || 'CreateGroup failed');
		const chat = {
			id: r.chatId,
			name: r.chatName,
			type: 'group',
			avatar: null,
			lastMessage: '',
			lastMessageTime: null,
			unreadCount: 0,
			hasGroupAutoKey: false,
			requiresCustomGroupPassword: !!groupOptions.requiresCustomPassword,
		};
		this.#chatsMeta.set(chat.id, chat);
		try {
			const setup = await this.#setupGroupKeys(chat.id, participantContactIds, groupOptions);
			chat.hasGroupAutoKey = true;
			if (setup?.missingCount > 0) {
				chat.keySetupWarning = setup.missingCount;
			}
		} catch (e) {
			console.warn('[MessengerApiClient] createGroup setup keys', e);
			chat.keySetupError = e;
		}
		return chat;
	}

	async getOrCreateChatById(chatId, chatName) {
		const r = await this.call('GetOrCreateChatById', {
			chatId,
			chatName
		});
		if (!r?.success) throw new Error(r?.error || 'GetOrCreateChatById failed');
		return r;
	}

	async sendActivity(chatId, activityType, active) {
		try {
			await this.call('SendUserActivity', {
				chatId,
				activityType,
				active
			});
		} catch (e) {
			console.warn('[MessengerApiClient] SendUserActivity', e);
		}
	}

	async getGroupInfo(chatId) {
		const r = await this.call('GetGroupInfo', { chatId });
		if (!r?.success) throw new Error(r?.error || 'GetGroupInfo failed');
		return r;
	}

	async updateGroup(chatId, { name, allowJoinByLink, requiresCustomGroupPassword } = {}) {
		const payload = { chatId };
		if (name != null) payload.name = name;
		if (allowJoinByLink != null) payload.allowJoinByLink = allowJoinByLink;
		if (requiresCustomGroupPassword != null) payload.requiresCustomGroupPassword = requiresCustomGroupPassword;
		const r = await this.call('UpdateGroup', payload);
		if (!r?.success) throw new Error(r?.error || 'UpdateGroup failed');
		return r;
	}

	async getGroupLinkPreview(chatId) {
		const r = await this.call('GetGroupLinkPreview', { chatId });
		if (!r?.success) throw new Error(r?.error || 'GetGroupLinkPreview failed');
		return r;
	}

	async joinGroupByLink(chatId) {
		const r = await this.call('JoinGroupByLink', { chatId });
		if (!r?.success) throw new Error(r?.error || 'JoinGroupByLink failed');
		return r;
	}

	async blockUser(contactUserId) {
		const r = await this.call('BlockUser', { contactUserId });
		if (!r?.success) throw new Error(r?.error || 'BlockUser failed');
		return r;
	}

	async blockGroup(chatId) {
		const r = await this.call('BlockGroup', { chatId });
		if (!r?.success) throw new Error(r?.error || 'BlockGroup failed');
		return r;
	}

	async uploadGroupAvatar(chatId, file) {
		const compressed = await compressImageFile(file, 512);
		const fd = new FormData();
		fd.append('photo', compressed);
		const r = await fetch(`/api/group/${encodeURIComponent(chatId)}/avatar`, {
			method: 'POST',
			body: fd,
			credentials: 'same-origin',
		});
		const data = await r.json().catch(() => ({}));
		if (!r.ok) throw new Error(data.error || 'Upload failed');
		return data;
	}

	async addGroupMembers(chatId, memberIds) {
		const r = await this.call('AddGroupMembers', {
			chatId,
			memberIds: JSON.stringify(memberIds),
		});
		if (!r?.success) throw new Error(r?.error || 'AddGroupMembers failed');
		await this.distributeMissingGroupKeys(chatId, { force: true });
		return r;
	}

	async decryptRealtimeMessage(chatId, msg) {
		return this.#decryptMessageFields(msg, chatId);
	}

	async decryptMessageForDisplay(m, chatId) {
		return this.#decryptMessageFields(m, chatId);
	}

	async messageForDisplay(msg, chatId) {
		if (!msg) return msg;
		if ((msg.encryptionTier || 'basic').toLowerCase() !== 'protected') return msg;
		if (this.#crypto?.getCustomPassword(chatId)) {
			const encText = msg._encText || (SupraCrypto.isEncrypted(msg.text) ? msg.text : null);
			if (encText && !SupraCrypto.isEncrypted(msg.text)) {
				return this.#decryptMessageFields({
					...msg,
					text: encText,
					replyToTextPreview: msg._encReplyPreview ?? msg.replyToTextPreview,
				}, chatId);
			}
			return msg;
		}
		const encText = msg._encText || (SupraCrypto.isEncrypted(msg.text) ? msg.text : null);
		if (encText) {
			return this.#decryptMessageFields({
				...msg,
				text: encText,
				replyToTextPreview: msg._encReplyPreview ?? msg.replyToTextPreview,
			}, chatId);
		}
		return {
			...msg,
			text: SupraCrypto.LOCKED_PREVIEW,
			replyToTextPreview: msg.replyToTextPreview ? SupraCrypto.LOCKED_PREVIEW : null,
			_locked: true,
		};
	}

	async promptGroupCustomPassword(chat, i18n) {
		if (!chat?.id) return true;
		const isGroup = chat.type === 'group' || chat.type === 'public_group';
		if (isGroup && !chat.requiresCustomGroupPassword) return true;
		if (this.#crypto?.getCustomPassword(chat.id)) return true;
		const pwd = await MessengerDialog.promptPassword({
			title: i18n.t('groupCustomPasswordTitle'),
			message: isGroup
				? i18n.t('groupCustomPasswordHint')
				: (i18n.t('directCustomPasswordHint') || 'Введите доп. пароль, который вам передал собеседник вне мессенджера.'),
			placeholder: i18n.t('groupCustomPasswordPlaceholder'),
			minLength: SupraAuthCrypto.GROUP_EXTRA_MIN_LENGTH,
			confirmLabel: i18n.t('ok'),
			cancelLabel: i18n.t('cancel'),
		});
		if (!pwd) return false;
		await this.#crypto.setCustomPassword(chat.id, pwd);
		this.#crypto.setExtraEncryptionEnabled(chat.id, true);
		this.#crypto.invalidateChatKey(chat.id);
		return true;
	}

	async removeGroupMember(chatId, memberUserId) {
		const r = await this.call('RemoveGroupMember', { chatId, memberUserId });
		if (!r?.success) throw new Error(r?.error || 'RemoveGroupMember failed');
		return r;
	}

	async setGroupMemberAdmin(chatId, memberUserId, isAdmin) {
		const r = await this.call('SetGroupMemberAdmin', { chatId, memberUserId, isAdmin });
		if (!r?.success) throw new Error(r?.error || 'SetGroupMemberAdmin failed');
		return r;
	}
}

class MessengerTransport {
	static BODY_TYPE = 'SupraMessenger';
	static MAX_CONNECT_ATTEMPTS = 6;
	static RETRY_DELAYS_MS = [1000, 2000, 5000, 10000, 15000, 30000];
	static SIGNALR_RECONNECT_DELAYS_MS = [0, 2000, 5000, 10000, 15000, 30000];
	static PAGE_RESUME_DEBOUNCE_MS = 250;
	static HEARTBEAT_MS = 30000;
	#onMessage;
	#wsUrl;
	#connectionState;
	#boundChannelHandler = null;
	#useServerChannel = false;
	#ws = null;
	#wsReconnectTimer = null;
	#signalRRetryTimer = null;
	#pageResumeDebounceTimer = null;
	#wsReconnectDelay = 1000;
	#wsConnectAttempts = 0;
	#signalRStartAttempts = 0;
	#signalRStoppingForRetry = false;
	#lastError = '';
	#destroyed = false;
	#boundOnPageActivated = null;
	#boundOnPageShow = null;
	#boundOnPageHide = null;
	#boundOnOnline = null;
	#heartbeatTimer = null;
	#onConnectionRestored = null;
	#hadConnectedOnce = false;
	constructor(onMessage, wsUrl = null, connectionState = null) {
		this.#onMessage = onMessage;
		this.#wsUrl = wsUrl;
		this.#connectionState = connectionState;
		this.#setConnectionState('connecting');
		this.#installPageLifecycleHandlers();
		this.#init();
	}
	setOnConnectionRestored(fn) {
		this.#onConnectionRestored = typeof fn === 'function' ? fn : null;
	}
	#markConnected() {
		this.#setConnectionState('connected');
		this.reportActivity();
		this.#startHeartbeat();
		if (this.#hadConnectedOnce) {
			try { this.#onConnectionRestored?.(); } catch (e) {
				console.warn('[MessengerTransport] onConnectionRestored error', e);
			}
		} else {
			this.#hadConnectedOnce = true;
		}
	}
	#installPageLifecycleHandlers() {
		this.#boundOnPageActivated = () => this.#onPageActivated();
		this.#boundOnPageShow = (e) => this.#onPageShow(e);
		this.#boundOnPageHide = () => this.#onPageHide();
		this.#boundOnOnline = () => this.resumeConnection('online');
		document.addEventListener('visibilitychange', this.#boundOnPageActivated);
		window.addEventListener('pageshow', this.#boundOnPageShow);
		window.addEventListener('pagehide', this.#boundOnPageHide);
		window.addEventListener('focus', this.#boundOnPageActivated);
		window.addEventListener('online', this.#boundOnOnline);
	}
	#removePageLifecycleHandlers() {
		if (this.#boundOnPageActivated) {
			document.removeEventListener('visibilitychange', this.#boundOnPageActivated);
			window.removeEventListener('focus', this.#boundOnPageActivated);
		}
		if (this.#boundOnPageShow)
			window.removeEventListener('pageshow', this.#boundOnPageShow);
		if (this.#boundOnPageHide)
			window.removeEventListener('pagehide', this.#boundOnPageHide);
		if (this.#boundOnOnline)
			window.removeEventListener('online', this.#boundOnOnline);
		this.#boundOnPageActivated = null;
		this.#boundOnPageShow = null;
		this.#boundOnPageHide = null;
		this.#boundOnOnline = null;
		clearTimeout(this.#pageResumeDebounceTimer);
		this.#pageResumeDebounceTimer = null;
	}
	#onPageHide() {
		this.#stopHeartbeat();
		const conn = this.#signalRConnection;
		if (conn && conn.state === 'Connected') {
			conn.stop().catch(() => {});
		}
	}
	#startHeartbeat() {
		if (this.#heartbeatTimer) return;
		this.#sendHeartbeat();
		this.#heartbeatTimer = setInterval(
			() => this.#sendHeartbeat(),
			MessengerTransport.HEARTBEAT_MS
		);
	}
	#stopHeartbeat() {
		if (!this.#heartbeatTimer) return;
		clearInterval(this.#heartbeatTimer);
		this.#heartbeatTimer = null;
	}
	#sendHeartbeat() {
		const conn = this.#signalRConnection;
		if (!conn || conn.state !== 'Connected') return;
		conn.invoke('Heartbeat').catch(() => {});
	}
	#onPageShow(e) {
		if (e.persisted) this.resumeConnection('pageshow-bfcache');
	}
	#onPageActivated() {
		if (document.visibilityState === 'hidden') return;
		clearTimeout(this.#pageResumeDebounceTimer);
		this.#pageResumeDebounceTimer = setTimeout(
			() => this.resumeConnection('visible'),
			MessengerTransport.PAGE_RESUME_DEBOUNCE_MS
		);
	}
	#clearReconnectTimers() {
		clearTimeout(this.#wsReconnectTimer);
		this.#wsReconnectTimer = null;
		clearTimeout(this.#signalRRetryTimer);
		this.#signalRRetryTimer = null;
	}
	/** Сброс отложенного reconnect и немедленная попытка (вкладка снова активна, сеть online). */
	resumeConnection(reason = 'manual') {
		if (this.#destroyed) return;
		this.#clearReconnectTimers();
		if (this.#signalRConnection) {
			this.#signalRResume(reason);
			return;
		}
		if (this.#useServerChannel) {
			this.#setConnectionState('connected');
			return;
		}
		this.#wsResume();
	}
	#signalRResume() {
		const conn = this.#signalRConnection;
		if (!conn || this.#destroyed) return;

		const state = conn.state;
		if (state === 'Connected') {
			this.reportActivity();
			return;
		}

		this.#signalRStartAttempts = 0;
		this.#setConnectionState('connecting');
		console.info('[MessengerTransport] Resume SignalR after page active, state:', state);

		const onConnected = () => {
			this.#signalRStartAttempts = 0;
			this.#lastError = '';
			this.#markConnected();
		};

		if (state === 'Disconnected') {
			conn.start().then(onConnected).catch((e) => this.#scheduleSignalRRetry(e));
			return;
		}

		this.#signalRStoppingForRetry = true;
		conn.stop().catch(() => {}).finally(() => {
			this.#signalRStoppingForRetry = false;
			if (this.#destroyed) return;
			conn.start().then(onConnected).catch((e) => this.#scheduleSignalRRetry(e));
		});
	}
	#wsResume() {
		if (this.#destroyed) return;
		if (this.#ws?.readyState === WebSocket.OPEN) {
			this.#setConnectionState('connected');
			return;
		}
		this.#wsConnectAttempts = 0;
		this.#wsReconnectDelay = 1000;
		if (this.#ws) {
			this.#ws.onclose = null;
			this.#ws.onerror = null;
			this.#ws.onmessage = null;
			try { this.#ws.close(); } catch { /* ignore */ }
			this.#ws = null;
		}
		console.info('[MessengerTransport] Resume WebSocket after page active');
		this.#wsConnect();
	}
	#setConnectionState(state, error = '') {
		if (error) this.#lastError = error;
		this.#connectionState?.setState(state, error || this.#lastError);
	}
	#formatConnectionError(err, fallback) {
		if (!err) return fallback;
		if (typeof err === 'string') return err;
		return err.message || fallback;
	}
	#init() {
		if (typeof signalR !== 'undefined') {
			this.#signalRConnect();
			return;
		}
		const hasTerrasoft = typeof Terrasoft !== 'undefined' &&
			Terrasoft?.ServerChannel?.on &&
			Terrasoft?.EventName?.ON_MESSAGE;
		if (hasTerrasoft) {
			this.#useServerChannel = true;
			this.#boundChannelHandler = this.#handleChannelEvent.bind(this);
			try {
				Terrasoft.ServerChannel.on(
					Terrasoft.EventName.ON_MESSAGE,
					this.#boundChannelHandler,
					this
				);
				this.#setConnectionState('connected');
			} catch (e) {
				console.warn('[MessengerTransport] ServerChannel error, fallback to WebSocket', e);
				this.#useServerChannel = false;
				this.#wsConnect();
			}
		} else {
			this.#wsConnect();
		}
	}
	#signalRConnection = null;
	#signalRConnect() {
		if (this.#destroyed) return;
		this.#setConnectionState('connecting');

		if (!this.#signalRConnection) {
			const hubUrl = MessengerAppContext.toAbsoluteUrl('/hubs/messenger');
			this.#signalRConnection = new signalR.HubConnectionBuilder()
				.withUrl(hubUrl, { withCredentials: true })
				.withAutomaticReconnect(MessengerTransport.SIGNALR_RECONNECT_DELAYS_MS)
				.build();
			this.#signalRConnection.on('message', (data) => this.#dispatch(data));
			this.#signalRConnection.onreconnecting((err) => {
				this.#setConnectionState('connecting', this.#formatConnectionError(err, this.#lastError));
			});
			this.#signalRConnection.onreconnected(() => {
				this.#signalRStartAttempts = 0;
				this.#lastError = '';
				this.#markConnected();
			});
			this.#signalRConnection.onclose((err) => {
				if (this.#destroyed || this.#signalRStoppingForRetry) return;
				const msg = this.#formatConnectionError(err, this.#lastError || 'Connection closed');
				this.#setConnectionState('offline', msg);
			});
		}

		this.#signalRConnection.start()
			.then(() => {
				this.#signalRStartAttempts = 0;
				this.#lastError = '';
				this.#markConnected();
			})
			.catch((e) => this.#scheduleSignalRRetry(e));
	}
	#scheduleSignalRRetry(error) {
		if (this.#destroyed) return;
		this.#signalRStartAttempts++;
		const msg = this.#formatConnectionError(error, 'Connection failed');
		this.#lastError = msg;
		if (this.#signalRStartAttempts >= MessengerTransport.MAX_CONNECT_ATTEMPTS) {
			this.#setConnectionState('offline', msg);
			return;
		}
		const delay = MessengerTransport.RETRY_DELAYS_MS[
			Math.min(this.#signalRStartAttempts - 1, MessengerTransport.RETRY_DELAYS_MS.length - 1)
		] ?? 30000;
		this.#setConnectionState('connecting', msg);
		this.#signalRRetryTimer = setTimeout(() => {
			this.#signalRRetryTimer = null;
			if (this.#destroyed) return;
			this.#signalRStoppingForRetry = true;
			this.#signalRConnection?.stop().catch(() => {}).finally(() => {
				this.#signalRStoppingForRetry = false;
				this.#signalRConnection = null;
				this.#signalRConnect();
			});
		}, delay);
	}

	reportActivity() {
		const conn = this.#signalRConnection;
		if (!conn || conn.state !== 'Connected') return;
		conn.invoke('ReportActivity').catch(() => {});
	}
	#resolveWsUrl() {
		if (this.#wsUrl) return this.#wsUrl;
		const absoluteHttpUrl = MessengerAppContext.toAbsoluteUrl('/hubs/messenger');
		const wsUrl = new URL(absoluteHttpUrl);
		wsUrl.protocol = wsUrl.protocol === 'https:' ? 'wss:' : 'ws:';
		return wsUrl.toString();
	}
	#wsConnect() {
		if (this.#destroyed) return;
		this.#setConnectionState('connecting');
		try {
			this.#ws = new WebSocket(this.#resolveWsUrl());
		} catch (e) {
			console.warn('[MessengerTransport] WebSocket connect failed', e);
			this.#wsScheduleReconnect(e);
			return;
		}
		this.#ws.onopen = () => {
			this.#wsConnectAttempts = 0;
			this.#wsReconnectDelay = 1000;
			this.#lastError = '';
			this.#markConnected();
		};
		this.#ws.onmessage = (event) => {
			let data;
			try {
				data = JSON.parse(event.data);
			} catch {
				return;
			}
			this.#dispatch(data);
		};
		this.#ws.onerror = (e) => {
			console.warn('[MessengerTransport] WebSocket error', e);
			this.#lastError = this.#formatConnectionError(e, 'WebSocket error');
		};
		this.#ws.onclose = () => {
			this.#ws = null;
			this.#wsScheduleReconnect();
		};
	}
	#wsScheduleReconnect(error) {
		if (this.#destroyed) return;
		this.#wsConnectAttempts++;
		const msg = this.#formatConnectionError(error, this.#lastError || 'Connection failed');
		this.#lastError = msg;
		if (this.#wsConnectAttempts >= MessengerTransport.MAX_CONNECT_ATTEMPTS) {
			this.#setConnectionState('offline', msg);
			return;
		}
		this.#setConnectionState('connecting', msg);
		console.info(`[MessengerTransport] Reconnect in ${this.#wsReconnectDelay / 1000}s…`);
		this.#wsReconnectTimer = setTimeout(() => {
			this.#wsReconnectDelay = Math.min(this.#wsReconnectDelay * 2, 30000);
			this.#wsConnect();
		}, this.#wsReconnectDelay);
	}
	#handleChannelEvent(event, message) {
		this.#dispatch(message);
	}
	#dispatch(message) {
		if (!message) return;
		let body = null;
		const header = message.Header ?? message.header ?? null;
		if (header) {
			const bodyTypeName = header.BodyTypeName ?? header.bodyTypeName ?? null;
			if (bodyTypeName && bodyTypeName !== MessengerTransport.BODY_TYPE) return;
			body = message.Body ?? message.body ?? null;
		} else if (message.type) {
			body = message;
		}
		if (!body || typeof body !== 'object') return;
		const type = body.type;
		if (!body.chatId && type !== 'SupraPresenceUpdate' && type !== 'SupraChatHistoryCleared' &&
			type !== 'SupraProfileUpdated') return;
		this.#onMessage(body);
	}
	destroy() {
		this.#destroyed = true;
		this.#stopHeartbeat();
		this.#removePageLifecycleHandlers();
		this.#clearReconnectTimers();
		if (this.#signalRConnection) {
			this.#signalRConnection.stop();
			this.#signalRConnection = null;
		}
		if (this.#useServerChannel && this.#boundChannelHandler) {
			try {
				Terrasoft.ServerChannel.un(
					Terrasoft.EventName.ON_MESSAGE,
					this.#boundChannelHandler,
					this
				);
			} catch (e) {
				console.warn('[MessengerTransport] unsubscribe error', e);
			}
			this.#boundChannelHandler = null;
		}
		if (this.#ws) {
			this.#ws.onclose = null;
			this.#ws.onerror = null;
			this.#ws.onmessage = null;
			this.#ws.close();
			this.#ws = null;
		}
	}
}

class MessengerCustomMessageRenderer {
	#utils;
	#icons;
	#i18n;
	#cache;

	constructor(utils, icons, i18n, cache = null) {
		this.#utils = utils;
		this.#icons = icons;
		this.#i18n = i18n;
		this.#cache = cache;
	}

	render(bubble, parsed) {
		const {
			contentType,
			payload
		} = parsed;
		if (contentType === MessengerCustomMessage.CONTENT_TYPES.IMAGE)
			this.#renderImage(bubble, payload);
		else
			this.#renderFile(bubble, payload);
	}

	#renderFile(bubble, payload) {
		bubble.classList.add('mc-file-bubble', 'mc-file-bubble-clickable');
		const header = this.#utils.mk('div', 'mc-file-bubble-header');
		const iconEl = this.#utils.mk('div', 'mc-file-bubble-icon');
		iconEl.innerHTML = this.#icons.fileDoc();
		const meta = this.#utils.mk('div', 'mc-file-bubble-meta');
		const nameEl = this.#utils.mk('div', 'mc-file-bubble-name');
		nameEl.textContent = payload.fileName;
		const sizeEl = this.#utils.mk('div', 'mc-file-bubble-size');
		sizeEl.textContent = MessengerFileUploadBubble.formatSize(payload.fileSize);
		meta.append(nameEl, sizeEl);
		header.append(iconEl, meta);
		bubble.appendChild(header);
		bubble.addEventListener('click', (e) => {
			if (e.target.closest('.mc-msg-footer')) return;
			const a = document.createElement('a');
			a.href = MessengerFileService.getFileUrl(payload.fileId);
			a.download = payload.fileName;
			a.target = '_blank';
			a.click();
		});
	}

	#renderImage(bubble, payload) {
		bubble.classList.add('mc-image-bubble');
		const url = MessengerFileService.getFileUrl(payload.fileId);
		const img = document.createElement('img');
		img.className = 'mc-bubble-image';
		img.alt = payload.fileName;

		img.dataset.viewerUrl = url;
		img.addEventListener('click', (e) => {
			e.stopPropagation();
			const msgArea = bubble.closest('.mc-messages');
			MessengerImageViewer.openForChat({
				src: url,
				displaySrc: img.src,
				icons: this.#icons,
				cache: this.#cache,
				msgArea,
			});
		});

		if (this.#cache) {
			this.#cache.applyThumbnailSrc(img, url);
		} else {
			img.src = url;
		}

		bubble.appendChild(img);
	}
}

class MessengerMessageHighlight {
	static HIGHLIGHT_MS = 2000;
	static #spotEl = null;
	static #dimOverlay = null;
	static #savedScroll = null;

	static #clearSpotlight() {
		MessengerMessageHighlight.#spotEl?.remove();
		MessengerMessageHighlight.#spotEl = null;
		MessengerMessageHighlight.#dimOverlay?.classList.remove('mapp-sheet-overlay--spotlight');
		MessengerMessageHighlight.#dimOverlay = null;
	}

	/** Возвращает чат в исходное положение и убирает временный отступ. */
	static #restoreScroll() {
		const s = MessengerMessageHighlight.#savedScroll;
		MessengerMessageHighlight.#savedScroll = null;
		if (!s || !s.area) return;
		s.area.querySelectorAll('.mc-msg-scroll-spacer').forEach(el => el.remove());
		s.area.scrollTop = s.top;
	}

	/**
	 * Поднимает выбранное сообщение полностью над нижним меню и "подсвечивает" его:
	 * тёмная маска (box-shadow) затемняет всё, кроме прямоугольника сообщения,
	 * фон оверлея меню делаем прозрачным, само сообщение не клонируется.
	 *
	 * Логика прокрутки (каждый раз от чистого состояния):
	 *  - сообщение выше края меню → остаётся на месте;
	 *  - ниже края меню → прокручиваем так, чтобы его низ встал к краю меню;
	 *  - если прокрутить некуда → добавляем место снизу и прокручиваем.
	 */
	static showAboveSheetMenu(row, sheetEl, msgArea) {
		MessengerMessageHighlight.#clearSpotlight();
		MessengerMessageHighlight.#restoreScroll();
		if (!row || !sheetEl) return;

		const overlay = sheetEl.closest('.mapp-sheet-overlay');
		overlay?.classList.add('mapp-sheet-overlay--spotlight');
		MessengerMessageHighlight.#dimOverlay = overlay;

		const gap = 14;
		const target = row.querySelector('.mc-bubble') || row;
		const sheetRect = sheetEl.getBoundingClientRect();
		// Лист выезжает снизу с анимацией, поэтому берём итоговую позицию по высоте.
		const menuTop = Math.max(0, window.innerHeight - sheetRect.height);
		const edge = menuTop - gap;

		if (msgArea) {
			// убираем любые остатки прошлого выделения и фиксируем базовую позицию
			msgArea.querySelectorAll('.mc-msg-scroll-spacer').forEach(el => el.remove());
			MessengerMessageHighlight.#savedScroll = { area: msgArea, top: msgArea.scrollTop };

			const rect0 = target.getBoundingClientRect();
			const overlap = rect0.bottom - edge;
			if (overlap > 0) {
				const room = msgArea.scrollHeight - msgArea.clientHeight - msgArea.scrollTop;
				if (room < overlap) {
					const spacer = document.createElement('div');
					spacer.className = 'mc-msg-scroll-spacer';
					spacer.setAttribute('aria-hidden', 'true');
					spacer.style.flexShrink = '0';
					spacer.style.height = `${Math.ceil(overlap - room + 8)}px`;
					msgArea.appendChild(spacer);
				}
				msgArea.scrollTop += overlap;
			}
		}

		const rect = target.getBoundingClientRect();
		const pad = 5;
		const spot = document.createElement('div');
		spot.className = 'mc-msg-spotlight';
		spot.style.top = `${rect.top - pad}px`;
		spot.style.left = `${rect.left - pad}px`;
		spot.style.width = `${rect.width + pad * 2}px`;
		spot.style.height = `${rect.height + pad * 2}px`;
		document.body.appendChild(spot);
		MessengerMessageHighlight.#spotEl = spot;
		row.classList.add('mc-msg-row--highlighted');
	}

	static #removeSpacer(msgArea) {
		msgArea?.querySelectorAll('.mc-msg-scroll-spacer').forEach(el => el.remove());
	}

	static #centerRowInView(msgArea, row) {
		const rowCenter = row.offsetTop + row.offsetHeight / 2;
		const idealScroll = rowCenter - msgArea.clientHeight / 2;
		const maxScroll = Math.max(0, msgArea.scrollHeight - msgArea.clientHeight);
		const targetScroll = Math.min(Math.max(0, idealScroll), maxScroll);
		msgArea.scrollTo({ top: targetScroll, behavior: 'smooth' });

		const ensureCentered = () => {
			const rowMidNow = rowCenter - msgArea.scrollTop;
			const viewportMid = msgArea.clientHeight / 2;
			const delta = rowMidNow - viewportMid;
			if (Math.abs(delta) < 4) return;
			let spacer = msgArea.querySelector('.mc-msg-scroll-spacer');
			if (delta > 0) {
				if (!spacer) {
					spacer = document.createElement('div');
					spacer.className = 'mc-msg-scroll-spacer';
					spacer.setAttribute('aria-hidden', 'true');
					msgArea.appendChild(spacer);
				}
				spacer.style.height = `${Math.ceil(delta + 8)}px`;
				spacer.style.flexShrink = '0';
				msgArea.scrollTop = msgArea.scrollHeight - msgArea.clientHeight;
			} else {
				MessengerMessageHighlight.#removeSpacer(msgArea);
				msgArea.scrollTop = Math.max(0, msgArea.scrollTop + delta);
			}
		};

		if (targetScroll >= maxScroll - 1 || targetScroll <= 0) {
			requestAnimationFrame(() => requestAnimationFrame(ensureCentered));
		} else {
			setTimeout(ensureCentered, 320);
		}
	}

	static focus(msgArea, msgId, { temporary = false } = {}) {
		if (!msgArea || !msgId) return null;
		const row = msgArea.querySelector(`.mc-msg-row[data-msg-id="${msgId}"]`);
		if (!row) return null;

		MessengerMessageHighlight.clear(msgArea);
		MessengerMessageHighlight.#centerRowInView(msgArea, row);
		row.classList.add('mc-msg-row--highlighted');
		if (temporary) {
			setTimeout(() => MessengerMessageHighlight.clear(msgArea), MessengerMessageHighlight.HIGHLIGHT_MS);
		}
		return row;
	}

	static clear(msgArea) {
		msgArea?.querySelectorAll('.mc-msg-row--highlighted').forEach(r => {
			r.classList.remove('mc-msg-row--highlighted');
		});
		MessengerMessageHighlight.#clearSpotlight();
		MessengerMessageHighlight.#restoreScroll();
		MessengerMessageHighlight.#removeSpacer(msgArea);
	}
}

class MessengerForwardModal {
	#utils;
	#icons;
	#avatarBuilder;
	#api;
	#i18n;
	#themeManager;
	static MAX_CONTACTS = 10;

	constructor(utils, icons, avatarBuilder, api, i18n, themeManager) {
		this.#utils = utils;
		this.#icons = icons;
		this.#avatarBuilder = avatarBuilder;
		this.#api = api;
		this.#i18n = i18n;
		this.#themeManager = themeManager;
	}

	open(onSend) {
		const selected = new Set();
		let targets = [];
		let extraContacts = [];
		let contactsPage = 1;
		let contactsHasMore = true;
		let loading = false;
		let query = '';
		let debounceTimer = null;

		const overlay = this.#utils.mk('div', 'mapp-modal-overlay');
		applyMobileFullscreenOverlay(overlay);
		lockAppScroll();
		const close = () => { unlockAppScroll(); overlay.remove(); };

		if (!overlay.classList.contains('mapp-modal-overlay--fullscreen')) {
			overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
		}

		const modal = this.#utils.mk('div', 'mapp-modal');
		this.#themeManager?.applyChatVars?.(modal);

		const header = this.#utils.mk('div', 'mapp-modal-header');
		const title = this.#utils.mk('div', 'mapp-modal-title');
		title.textContent = this.#i18n.t('forwardTitle');
		const closeBtn = this.#utils.mk('button', 'mapp-modal-close');
		closeBtn.innerHTML = '×';
		closeBtn.addEventListener('click', close);
		header.append(title, closeBtn);

		const { wrap: searchWrap, input: searchInput } = buildContactSearchBar(
			this.#icons,
			this.#i18n.t('forwardSearch') || this.#i18n.t('searchContacts'),
		);
		searchWrap.classList.add('mapp-modal-search-wrap');

		const contactsList = this.#utils.mk('div', 'mapp-modal-contacts');
		const footer = this.#utils.mk('div', 'mapp-modal-footer');
		const sendBtn = this.#utils.mk('button', 'mapp-btn mapp-btn-primary mapp-modal-footer-btn');
		sendBtn.textContent = this.#i18n.t('forwardSend');
		sendBtn.disabled = true;
		footer.appendChild(sendBtn);

		const redraw = () => {
			contactsList.querySelectorAll('.mapp-modal-contact-item').forEach(item => {
				const id = item.dataset.contactId;
				item.classList.toggle('mapp-modal-contact-item--selected', selected.has(id));
			});
			sendBtn.disabled = selected.size === 0;
		};

		const isGroupType = (type) => type === 'group' || type === 'public_group';

		const renderTargets = (list) => {
			contactsList.innerHTML = '';
			if (!list.length) {
				const empty = this.#utils.mk('div', 'mapp-list-empty');
				empty.textContent = query.length >= MessengerSidebar.MIN_SEARCH_LEN
					? (this.#i18n.t('forwardChatsNotFound') || this.#i18n.t('contactsNotFound') || '')
					: (this.#i18n.t('searchContactsHint') || '');
				contactsList.appendChild(empty);
				return;
			}
			for (const t of list) {
				const item = this.#utils.mk('div', 'mapp-modal-contact-item');
				item.dataset.contactId = t.id;
				if (selected.has(t.id)) item.classList.add('mapp-modal-contact-item--selected');
				const av = this.#avatarBuilder.build(t.id, t.name, t.avatar, 40);
				const nameEl = this.#utils.mk('div', 'mapp-modal-contact-name');
				nameEl.textContent = t.name;
				if (isGroupType(t.type)) {
					const typeIcon = this.#utils.mk('span', 'mapp-modal-contact-type-icon');
					typeIcon.innerHTML = this.#icons.groupUsers();
					nameEl.prepend(typeIcon);
				}
				item.append(av, nameEl);
				item.addEventListener('click', () => {
					if (selected.has(t.id)) {
						selected.delete(t.id);
					} else if (selected.size >= MessengerForwardModal.MAX_CONTACTS) {
						MessengerDialog.alert({
							message: this.#i18n.t('forwardMaxContacts'),
							themeManager: this.#themeManager,
						});
						return;
					} else {
						selected.add(t.id);
					}
					redraw();
				});
				contactsList.appendChild(item);
			}
		};

		const filterTargets = () => {
			const q = query.toLowerCase();
			let list = targets.slice();
			if (q.length >= MessengerSidebar.MIN_SEARCH_LEN) {
				list = list.filter(t => (t.name || '').toLowerCase().includes(q));
			}
			const chatContactIds = new Set(
				targets.filter(t => t.type === 'direct' && t.contactUserId).map(t => t.contactUserId)
			);
			for (const c of extraContacts) {
				if (chatContactIds.has(c.id)) continue;
				if (q.length >= MessengerSidebar.MIN_SEARCH_LEN &&
					!(c.name || '').toLowerCase().includes(q)) continue;
				list.push({ id: c.id, name: c.name, avatar: c.avatar, type: 'contact' });
			}
			list.sort((a, b) => (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' }));
			renderTargets(list);
		};

		const loadChats = async () => {
			loading = true;
			contactsList.innerHTML = '';
			const loadingEl = this.#utils.mk('div', 'mapp-modal-loading');
			loadingEl.textContent = this.#i18n.t('loading');
			contactsList.appendChild(loadingEl);
			try {
				const chats = await this.#api.getChats();
				targets = chats.map(c => ({
					id: c.id,
					name: c.name,
					avatar: c.avatar,
					type: c.type,
					contactUserId: c.contactUserId || null,
				}));
				filterTargets();
			} catch (e) {
				console.warn('[MessengerForwardModal] load chats', e);
			}
			loading = false;
		};

		const loadContactsPage = async (append) => {
			if (loading || !contactsHasMore) return;
			loading = true;
			try {
				const batch = await this.#api.getAllContacts(contactsPage, 50, query);
				if (batch.length < 50) contactsHasMore = false;
				if (!append) extraContacts = [];
				extraContacts.push(...batch);
				filterTargets();
				contactsPage += 1;
			} catch (e) {
				console.warn('[MessengerForwardModal] load contacts', e);
			}
			loading = false;
		};

		searchInput.addEventListener('input', () => {
			clearTimeout(debounceTimer);
			debounceTimer = setTimeout(() => {
				const q = searchInput.value.trim();
				if (q.length > 0 && q.length < MessengerSidebar.MIN_SEARCH_LEN) return;
				query = q;
				contactsPage = 1;
				contactsHasMore = true;
				filterTargets();
				if (query.length >= MessengerSidebar.MIN_SEARCH_LEN) {
					loadContactsPage(false);
				}
			}, 300);
		});

		contactsList.addEventListener('scroll', () => {
			const { scrollTop, scrollHeight, clientHeight } = contactsList;
			if (scrollHeight - scrollTop - clientHeight < 60 &&
				query.length >= MessengerSidebar.MIN_SEARCH_LEN) {
				loadContactsPage(true);
			}
		});

		sendBtn.addEventListener('click', async () => {
			if (!selected.size) return;
			sendBtn.disabled = true;
			try {
				await onSend([...selected]);
				close();
			} catch (e) {
				console.warn('[MessengerForwardModal] send', e);
				sendBtn.disabled = false;
			}
		});

		modal.append(header, searchWrap, contactsList, footer);
		overlay.appendChild(modal);
		document.body.appendChild(overlay);
		loadChats();
	}
}

class MessengerMessageRenderer {
	#utils;
	#icons;
	#avatarBuilder;
	#i18n;
	#cache;
	#customRenderer;
	static #TYPING_STOP_DELAY = 3000;
	constructor(utils, icons, avatarBuilder, i18n, cache = null) {
		this.#utils = utils;
		this.#icons = icons;
		this.#avatarBuilder = avatarBuilder;
		this.#i18n = i18n;
		this.#cache = cache;
		this.#customRenderer = new MessengerCustomMessageRenderer(utils, icons, i18n, cache);
	}
	#renderMarkdown(text) {
		if (!text) return '';
		let s = text
			.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
		s = s.replace(/`([^`]+)`/g, '<code class="mc-msg-code">$1</code>');
		s = s.replace(/\*\*\*(.+?)\*\*\*/gs, '<strong><em>$1</em></strong>');
		s = s.replace(/\*\*(.+?)\*\*/gs, '<strong>$1</strong>');
		s = s.replace(/\*(.+?)\*/gs, '<em>$1</em>');
		s = s.replace(/~~(.+?)~~/gs, '<del>$1</del>');
		s = s.replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, (match, label, href) => {
			try {
				const parsed = new URL(href);
				if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
					return label;
				}
				const safeHref = href
					.replace(/&/g, '&amp;')
					.replace(/"/g, '&quot;')
					.replace(/</g, '&lt;')
					.replace(/>/g, '&gt;');
				return `<a href="${safeHref}" target="_blank" rel="noopener noreferrer">${label}</a>`;
			} catch (e) {
				return label;
			}
		});
		s = s.replace(/\n/g, '<br>');
		return s;
	}

	#isLockedMsg(msg) {
		return !!msg?._locked
			|| msg?.text === SupraCrypto.LOCKED_OTHER
			|| msg?.text === SupraCrypto.LOCKED_PREVIEW;
	}

	#lockedDisplayText(msg) {
		const tier = (msg?.encryptionTier || 'basic').toLowerCase();
		if (tier === 'protected' && this.#isLockedMsg(msg)) {
			return this.#i18n.t('msgHiddenProtected') || SupraCrypto.LOCKED_PREVIEW;
		}
		if (msg?.text === SupraCrypto.LOCKED_OTHER) {
			return this.#i18n.t('msgLocked') || SupraCrypto.LOCKED_OTHER;
		}
		if (msg?.text === SupraCrypto.LOCKED_PREVIEW) {
			return this.#i18n.t('msgHiddenProtected') || msg.text;
		}
		if (msg?._locked) {
			return this.#i18n.t('msgHiddenProtected') || SupraCrypto.LOCKED_PREVIEW;
		}
		return msg?.text || this.#i18n.t('msgLocked') || SupraCrypto.LOCKED_PREVIEW;
	}

	#appendMessageText(bubble, msg) {
		const parsed = MessengerCustomMessage.parse(msg.text);
		if (parsed) {
			this.#customRenderer.render(bubble, parsed);
			return;
		}
		const textEl = this.#utils.mk('div', 'mc-msg-text');
		if (this.#isLockedMsg(msg)) {
			textEl.classList.add('mc-msg-text--locked');
			textEl.textContent = this.#lockedDisplayText(msg);
		} else {
			textEl.innerHTML = this.#renderMarkdown(msg.text);
		}
		const footer = bubble.querySelector('.mc-msg-footer');
		bubble.insertBefore(textEl, footer || null);
	}

	#syncTierLock(footer, msg, isMine) {
		if (!footer) return;
		footer.querySelector('.mc-msg-tier-lock')?.remove();
		const tier = (msg.encryptionTier || 'basic').toLowerCase();
		if (tier !== 'protected') return;
		const lockEl = this.#utils.mk('span', 'mc-msg-tier-lock');
		lockEl.innerHTML = this.#icons.lockClosedSmall();
		const anchor = isMine
			? (footer.querySelector('.mc-msg-status') || footer.lastChild)
			: (footer.querySelector('.mc-msg-time') || footer.lastChild);
		if (anchor) footer.insertBefore(lockEl, anchor);
		else footer.appendChild(lockEl);
	}

	#syncTierBadge(bubble, msg, isMine = false) {
		const footer = bubble.querySelector('.mc-msg-footer');
		this.#syncTierLock(footer, msg, isMine);
	}

	refreshMessageTierLock(rowEl, msg) {
		if (!rowEl || !msg) return;
		const footer = rowEl.querySelector('.mc-msg-footer');
		const isMine = rowEl.classList.contains('mc-msg-row--mine');
		this.#syncTierLock(footer, msg, isMine);
	}

	createDateSeparatorEl(msg) {
		const d = msg.timestamp instanceof Date ? msg.timestamp : new Date(msg.timestamp);
		const now = new Date();
		const sameDay = (a, b) =>
			a.getFullYear() === b.getFullYear() &&
			a.getMonth() === b.getMonth() &&
			a.getDate() === b.getDate();
		let label;
		if (sameDay(d, now)) {
			label = this.#i18n.t('today') || 'Сегодня';
		} else {
			const yesterday = new Date(now);
			yesterday.setDate(now.getDate() - 1);
			if (sameDay(d, yesterday)) {
				label = this.#i18n.t('yesterday') || 'Вчера';
			} else {
				const loc = this.#i18n.locale + '-' + this.#i18n.locale.toUpperCase();
				label = d.toLocaleDateString(loc, { day: 'numeric', month: 'long', year: 'numeric' });
			}
		}
		const loc = this.#i18n.locale + '-' + this.#i18n.locale.toUpperCase();
		const fullDate = d.toLocaleDateString(loc, {
			weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
		});
		const wrap = this.#utils.mk('div', 'mc-date-separator');
		wrap.dataset.msgId = msg.id;
		wrap.dataset.dateSep = '1';
		const pill = this.#utils.mk('span', 'mc-date-separator-pill');
		pill.textContent = label;
		pill.title = fullDate;
		pill.dataset.tooltip = fullDate;
		pill.classList.add('mc-date-separator-pill--has-tooltip');
		wrap.appendChild(pill);
		return wrap;
	}
	createSystemEventEl(msg) {
		const parsed = MessengerCustomMessage.parse(msg.text);
		const payload = parsed?.payload || {};
		const kind = payload.kind || '';
		let label = '';
		if (kind === 'groupRenamed') {
			label = (this.#i18n.t('systemGroupRenamed') || '')
				.replace('{actor}', payload.actorName || '')
				.replace('{name}', payload.newName || '');
		} else if (kind === 'groupAvatarChanged') {
			label = (this.#i18n.t('systemGroupAvatarChanged') || '')
				.replace('{actor}', payload.actorName || '');
		} else if (kind === 'groupAdminGranted') {
			label = (this.#i18n.t('systemGroupAdminGranted') || '')
				.replace('{actor}', payload.actorName || '')
				.replace('{target}', payload.targetName || '');
		} else if (kind === 'groupAdminRevoked') {
			label = (this.#i18n.t('systemGroupAdminRevoked') || '')
				.replace('{actor}', payload.actorName || '')
				.replace('{target}', payload.targetName || '');
		}
		const wrap = this.#utils.mk('div', 'mc-system-event');
		wrap.dataset.msgId = msg.id;
		const ts = msg.timestamp instanceof Date ? msg.timestamp.getTime() : new Date(msg.timestamp).getTime();
		wrap.dataset.msgTs = String(ts);
		const pill = this.#utils.mk('span', 'mc-system-event-pill');
		pill.textContent = label || msg.text || '';
		wrap.appendChild(pill);
		return wrap;
	}
	#buildQuoteBlock(msg, onQuoteClick) {
		if (!msg.replyToMessageId) return null;
		const quote = this.#utils.mk('div', 'mc-msg-quote');
		quote.dataset.replyToId = msg.replyToMessageId;
		const author = this.#utils.mk('div', 'mc-msg-quote-author');
		author.textContent = msg.replyToSenderName || '';
		const prev = msg.replyToTextPreview || '';
		const locked = prev === SupraCrypto.LOCKED_OTHER || prev === SupraCrypto.LOCKED_PREVIEW;
		const preview = buildQuotePreviewContent({
			utils: this.#utils,
			cache: this.#cache,
			previewText: prev,
			locked,
			lockedLabel: this.#i18n.t('msgHiddenProtected') || this.#i18n.t('msgLocked') || prev,
		});
		quote.append(author, preview);
		if (typeof onQuoteClick === 'function') {
			quote.addEventListener('click', e => {
				e.stopPropagation();
				onQuoteClick(msg.replyToMessageId);
			});
		}
		return quote;
	}

	createMsgEl(msg, currentUser, avatarCache, onAvatarClick, onQuoteClick = null) {
		const isMine = !!msg.isOwn;
		const isDeleted = !!msg.deletedForEveryone;
		const row = this.#utils.mk('div', `mc-msg-row ${isMine ? 'mc-msg-row--mine' : 'mc-msg-row--other'}`);
		if (msg.senderId) row.dataset.senderId = msg.senderId;
		row.dataset.msgId = msg.id;
		const ts = msg.timestamp instanceof Date ? msg.timestamp.getTime() : new Date(msg.timestamp).getTime();
		row.dataset.msgTs = String(ts);
		const senderName = isMine ? (currentUser?.name || msg.senderName) : msg.senderName;
		const colorSeed = isMine ? (currentUser?.colorSeed || msg.senderId) : msg.senderId;
		let cachedAvatar = msg.senderId ? (avatarCache.get(msg.senderId) || null) : null;
		if (!cachedAvatar && msg.senderAvatar) {
			cachedAvatar = msg.senderAvatar;
			if (msg.senderId) avatarCache.set(msg.senderId, msg.senderAvatar);
		}
		const avatar = this.#avatarBuilder.build(colorSeed, senderName || '?', cachedAvatar, 30);
		avatar.classList.add('mc-msg-avatar');
		if (!isMine && typeof onAvatarClick === 'function') {
			avatar.classList.add('mc-cursor-pointer');
			avatar.addEventListener('click', e => {
				e.stopPropagation();
				onAvatarClick(msg);
			});
		}
		const bubble = this.#utils.mk('div', 'mc-bubble');
		if (!isMine && msg.senderName) {
			const senderEl = this.#utils.mk('div', 'mc-msg-sender');
			senderEl.textContent = msg.senderName;
			bubble.appendChild(senderEl);
		}
		if (msg.forwardedFromSenderName) {
			const fwdEl = this.#utils.mk('div', 'mc-msg-forward-label');
			const fn = this.#i18n.t('forwardedFrom');
			fwdEl.textContent = typeof fn === 'function' ? fn(msg.forwardedFromSenderName) : `(от ${msg.forwardedFromSenderName})`;
			bubble.appendChild(fwdEl);
		}
		const quoteEl = this.#buildQuoteBlock(msg, onQuoteClick);
		if (quoteEl) bubble.appendChild(quoteEl);
		if (isDeleted) {
			const textEl = this.#utils.mk('div', 'mc-msg-text mc-msg-text--deleted');
			textEl.textContent = this.#i18n.t('messageDeleted');
			bubble.appendChild(textEl);
		} else {
			this.#appendMessageText(bubble, msg);
		}
		const footer = this.#utils.mk('div', 'mc-msg-footer');
		if (msg.editedOn && !isDeleted) {
			const editedEl = this.#utils.mk('span', 'mc-msg-edited');
			editedEl.textContent = this.#i18n.t('edited');
			footer.appendChild(editedEl);
		}
		const timeEl = this.#utils.mk('span', 'mc-msg-time');
		timeEl.textContent = this.#utils.formatTime(msg.timestamp);
		footer.appendChild(timeEl);
		if (isMine) {
			const statusEl = this.#utils.mk('span', 'mc-msg-status');
			this.setStatusIcon(statusEl, msg.status || 'sent');
			footer.appendChild(statusEl);
		}
		this.#syncTierLock(footer, msg, isMine);
		bubble.appendChild(footer);
		if (isMine) row.append(bubble);
		else row.append(avatar, bubble);
		return row;
	}

	updateMsgContent(entry, msg, onQuoteClick = null) {
		if (!entry?.el) return;
		const bubble = entry.el.querySelector('.mc-bubble');
		if (!bubble) return;
		const oldQuote = bubble.querySelector('.mc-msg-quote');
		if (oldQuote) oldQuote.remove();
		const oldFwd = bubble.querySelector('.mc-msg-forward-label');
		if (oldFwd) oldFwd.remove();
		const oldText = bubble.querySelector('.mc-msg-text');
		if (oldText) oldText.remove();
		if (msg.forwardedFromSenderName) {
			const fwdEl = this.#utils.mk('div', 'mc-msg-forward-label');
			const fn = this.#i18n.t('forwardedFrom');
			fwdEl.textContent = typeof fn === 'function' ? fn(msg.forwardedFromSenderName) : `(от ${msg.forwardedFromSenderName})`;
			const footer = bubble.querySelector('.mc-msg-footer');
			bubble.insertBefore(fwdEl, footer);
		}
		const quoteEl = this.#buildQuoteBlock(msg, onQuoteClick);
		if (quoteEl) {
			const footer = bubble.querySelector('.mc-msg-footer');
			bubble.insertBefore(quoteEl, footer);
		}
		const isDeleted = !!msg.deletedForEveryone;
		if (isDeleted) {
			const textEl = this.#utils.mk('div', 'mc-msg-text mc-msg-text--deleted');
			textEl.textContent = this.#i18n.t('messageDeleted');
			const footer = bubble.querySelector('.mc-msg-footer');
			bubble.insertBefore(textEl, footer);
		} else {
			this.#appendMessageText(bubble, msg);
		}
		this.#syncTierBadge(bubble, msg, !!entry?.el?.classList?.contains('mc-msg-row--mine'));
		const footer = bubble.querySelector('.mc-msg-footer');
		let editedEl = footer?.querySelector('.mc-msg-edited');
		if (msg.editedOn && !isDeleted) {
			if (!editedEl) {
				editedEl = this.#utils.mk('span', 'mc-msg-edited');
				footer.insertBefore(editedEl, footer.firstChild);
			}
			editedEl.textContent = this.#i18n.t('edited');
		} else if (editedEl) {
			editedEl.remove();
		}
	}
	setStatusIcon(el, status) {
		el.innerHTML = '';
		el.className = `mc-msg-status mc-msg-status--${status}`;
		if (status === 'sending') el.appendChild(this.#utils.mk('span', 'mc-spinner'));
		else if (status === 'sent') el.innerHTML = this.#icons.checkSingle();
		else if (status === 'read') el.innerHTML = this.#icons.checkDouble();
		else if (status === 'error') {
			el.textContent = '⚠';
			el.title = this.#i18n.t('messageFailed');
			el.dataset.tooltip = this.#i18n.t('retryMessage');
		}
	}
	buildActivityBar() {
		const bar = this.#utils.mk('div', 'mc-activity-bar');
		const dots = this.#utils.mk('span', 'mc-activity-dots');
		dots.innerHTML = '<span></span><span></span><span></span>';
		const textEl = this.#utils.mk('span', 'mc-activity-text');
		bar.append(dots, textEl);
		return bar;
	}
	updateActivityBar(bar, activities, i18n) {
		if (!bar) return;
		const textEl = bar.querySelector('.mc-activity-text');
		if (!activities || activities.length === 0) {
			bar.classList.remove('mc-activity-bar--visible');
			if (textEl) textEl.textContent = '';
			return;
		}
		bar.classList.add('mc-activity-bar--visible');
		if (!textEl) return;
		const unique = [...new Map(activities.map(a => [a.userId, a])).values()];
		if (unique.length === 1) {
			textEl.textContent = i18n.tActivity(unique[0].activityType, unique[0].userName);
		} else if (unique.length <= 3) {
			textEl.textContent = unique.map(u => u.userName).join(', ') +
				' ' + (i18n.locale === 'ru' ? 'печатают' : 'are typing');
		} else {
			textEl.textContent = i18n.tActivityMany(unique.length);
		}
	}
	buildInputArea(chatId, msgArea, onSend, onActivity = null, fileOptions = null) {
		const area = this.#utils.mk('div', 'mc-input-area');
		const field = this.#utils.mk('textarea', 'mc-input-field');
		field.placeholder = this.#i18n.t('writeMessage');
		field.rows = 1;
		let typingStopTimer = null, lastActivitySentAt = 0;
		const THROTTLE_MS = MessengerActivityTracker.DEFAULT_TIMEOUT;
		const resetFieldHeight = () => {
			field.style.height = '';
			field.rows = 1;
		};
		const sendStop = () => {
			clearTimeout(typingStopTimer);
			typingStopTimer = null;
			lastActivitySentAt = 0;
			if (onActivity) onActivity('typing', false);
		};
		const doSend = () => {
			sendStop();
			onSend(chatId, field, msgArea);
			resetFieldHeight();
		};
		field.addEventListener('input', () => {
			field.style.height = 'auto';
			if (field.scrollHeight > 40) field.style.height = Math.min(field.scrollHeight, 120) + 'px';
			if (MessengerUtils.isMobile()) {
				const panel = msgArea.closest('.mapp-chat-panel, .mc-root');
				if (MessengerUtils.shouldPinMessagesToComposer(msgArea, panel)) {
					msgArea.scrollTop = msgArea.scrollHeight;
				}
			}
			if (onActivity) {
				const now = Date.now();
				if (now - lastActivitySentAt >= THROTTLE_MS) {
					lastActivitySentAt = now;
					onActivity('typing', true);
				}
				clearTimeout(typingStopTimer);
				typingStopTimer = setTimeout(sendStop, MessengerMessageRenderer.#TYPING_STOP_DELAY);
			}
		});
		field.addEventListener('keydown', e => {
			if (e.key === 'Enter' && !e.shiftKey && MessengerChatPreferences.getSendOnEnter()) {
				e.preventDefault();
				doSend();
			}
		});
		if (MessengerUtils.isMobile()) {
			field.addEventListener('focus', () => {
				requestAnimationFrame(() => {
					window.scrollTo(0, 0);
					MessengerUtils.scrollToBottom(msgArea);
				});
			});
		}
		const btn = this.#utils.mk('button', 'mc-send-btn');
		btn.type = 'button';
		btn.innerHTML = this.#icons.send();
		btn.addEventListener('click', doSend);
		if (fileOptions && Array.isArray(fileOptions.types) && fileOptions.types.length > 0) {
			const attachMenu = new MessengerAttachMenu(
				this.#utils, this.#icons, this.#i18n, fileOptions.types,
				(type) => fileOptions.onFileUpload && fileOptions.onFileUpload(type, chatId, msgArea)
			);
			area.append(attachMenu.build(), field, btn);
		} else {
			area.append(field, btn);
		}
		return area;
	}
}

class MessengerChatPanel {
	#utils;
	#icons;
	#avatarBuilder;
	#msgRenderer;
	#themeManager;
	#i18n;
	#api;
	#cache;
	#msgService;
	#pageSize;
	#fileHandler;
	#presence = null;
	#connectionStateMgr = null;
	#forwardModal = null;
	#readGate = null;
	#chatVisibleFn = null;
	constructor(utils, icons, avatarBuilder, msgRenderer, themeManager, i18n, api, pageSize = 20, cache = null, presence = null) {
		this.#utils = utils;
		this.#icons = icons;
		this.#avatarBuilder = avatarBuilder;
		this.#msgRenderer = msgRenderer;
		this.#themeManager = themeManager;
		this.#i18n = i18n;
		this.#api = api;
		this.#cache = cache;
		this.#pageSize = pageSize;
		this.#presence = presence;
		this.#msgService = new MessengerMessageService(cache);
		this.#fileHandler = new MessengerFileHandler(utils, icons, i18n, api, cache);
	}
	setPresenceManager(presence) { this.#presence = presence; }
	setConnectionStateManager(mgr) { this.#connectionStateMgr = mgr; }

	#canShowContactPresence() {
		return this.#connectionStateMgr?.state === MessengerConnectionStateManager.STATE_CONNECTED;
	}

	setReadEngagement(readGate, chatVisibleFn) {
		this.#readGate = readGate;
		this.#chatVisibleFn = chatVisibleFn;
	}

	async #getDisplayMessages(chatId) {
		return this.#msgService.getDisplayMessages(chatId, this.#api);
	}

	#resolveRowMessage(state, row, msg) {
		const msgId = row?.dataset?.msgId || msg?.id;
		if (msgId && state.messages?.get) {
			const direct = state.messages.get(msgId);
			if (direct?.data) return direct.data;
			for (const entry of state.messages.values()) {
				const d = entry.data;
				if (!d) continue;
				if (d.id === msgId || d.serverId === msgId) return d;
			}
		}
		return row?._msgData || msg;
	}

	#shouldOfferEnterPassword(state, msg, row = null) {
		if (typeof state.onEnterExtraPassword !== 'function') return false;
		if (this.#api.getCrypto()?.getCustomPassword(state.chatId)) return false;
		const m = this.#resolveRowMessage(state, row, msg);
		const tier = (m?.encryptionTier || 'basic').toLowerCase();
		if (tier === 'protected') return true;
		if (row?.querySelector?.('.mc-msg-text--locked')
			&& this.#api.chatUsesExtraPasswordMode(state.chatId)) {
			return true;
		}
		return false;
	}

	async relockProtectedMessages(state, chatId) {
		if (!state?.messages?.size) return;
		const cached = await this.#cache.getMessages(chatId);
		const cacheById = new Map();
		for (const row of cached) {
			if (row.isVirtual) continue;
			cacheById.set(row.id, row);
			if (row.serverId) cacheById.set(row.serverId, row);
		}
		for (const entry of state.messages.values()) {
			const m = entry.data;
			if (!m || m.isVirtual) continue;
			if ((m.encryptionTier || 'basic').toLowerCase() !== 'protected') continue;
			const cachedRow = cacheById.get(m.id) || cacheById.get(m.serverId);
			const encText = (cachedRow && SupraCrypto.isEncrypted(cachedRow.text) ? cachedRow.text : null)
				|| m._encText
				|| (SupraCrypto.isEncrypted(m.text) ? m.text : null);
			if (!encText) continue;
			const encReply = (cachedRow?.replyToTextPreview && SupraCrypto.isEncrypted(cachedRow.replyToTextPreview)
				? cachedRow.replyToTextPreview
				: null)
				|| m._encReplyPreview
				|| (SupraCrypto.isEncrypted(m.replyToTextPreview) ? m.replyToTextPreview : null);
			const relocked = await this.#api.decryptMessageForDisplay({
				...m,
				text: encText,
				replyToTextPreview: encReply,
				_encText: encText,
				_encReplyPreview: encReply,
			}, chatId);
			entry.data = { ...relocked, _encText: encText, _encReplyPreview: encReply };
			if (entry.el) {
				this.#msgRenderer.updateMsgContent(
					entry,
					relocked,
					id => this.#scrollToQuotedMessage(state, id)
				);
				entry.el._msgData = relocked;
			}
		}
	}

	async unlockProtectedMessages(state, chat) {
		return this.refreshProtectedMessagesDisplay(state, chat?.id || state?.chatId);
	}

	async refreshProtectedMessagesDisplay(state, chatId) {
		if (!state?.messages?.size || !chatId) return { unlocked: 0, failed: 0 };
		const cached = await this.#cache.getMessages(chatId);
		const cacheById = new Map();
		for (const row of cached) {
			if (row.isVirtual) continue;
			cacheById.set(row.id, row);
			if (row.serverId) cacheById.set(row.serverId, row);
		}
		let unlocked = 0;
		let failed = 0;
		for (const entry of state.messages.values()) {
			const m = entry.data;
			if (!m || m.isVirtual) continue;
			if ((m.encryptionTier || 'basic').toLowerCase() !== 'protected') continue;
			const cachedRow = cacheById.get(m.id) || cacheById.get(m.serverId);
			const encText = (cachedRow && SupraCrypto.isEncrypted(cachedRow.text) ? cachedRow.text : null)
				|| m._encText
				|| (SupraCrypto.isEncrypted(m.text) ? m.text : null);
			if (!encText) {
				failed++;
				continue;
			}
			const encReply = (cachedRow?.replyToTextPreview && SupraCrypto.isEncrypted(cachedRow.replyToTextPreview)
				? cachedRow.replyToTextPreview
				: null)
				|| m._encReplyPreview
				|| (SupraCrypto.isEncrypted(m.replyToTextPreview) ? m.replyToTextPreview : null);
			const decrypted = await this.#api.decryptMessageForDisplay({
				...m,
				text: encText,
				replyToTextPreview: encReply,
				_encText: encText,
				_encReplyPreview: encReply,
			}, chatId);
			if (decrypted._locked || decrypted.text === SupraCrypto.LOCKED_PREVIEW) {
				failed++;
				continue;
			}
			entry.data = {
				...decrypted,
				_encText: encText,
				_encReplyPreview: encReply,
			};
			unlocked++;
			if (entry.el) {
				this.#msgRenderer.updateMsgContent(
					entry,
					entry.data,
					id => this.#scrollToQuotedMessage(state, id)
				);
				entry.el._msgData = entry.data;
			}
		}
		return { unlocked, failed };
	}

	#chatHasMessagesHint(chatId) {
		const chat = this.#api.chatMeta?.(chatId);
		if (!chat) return false;
		const preview = chat.lastMessage;
		if (typeof preview === 'string' && preview.trim()) return true;
		return !!chat.lastMessageTime;
	}

	#showMessagesStatus(state, text) {
		if (!text) {
			this.#hideMessagesStatus(state);
			return;
		}
		if (!state.messagesStatusEl) {
			state.messagesStatusEl = this.#utils.mk('div', 'mc-messages-status');
			state.msgArea.appendChild(state.messagesStatusEl);
		}
		state.messagesStatusEl.textContent = text;
		state.messagesStatusEl.hidden = false;
	}

	#hideMessagesStatus(state) {
		if (state.messagesStatusEl) state.messagesStatusEl.hidden = true;
	}

	#refreshMessagesStatusForLoad(state, chatId) {
		if (state.firstLoadDone) return;
		const text = this.#chatHasMessagesHint(chatId)
			? this.#i18n.t('messagesLoading')
			: this.#i18n.t('messagesEmpty');
		this.#showMessagesStatus(state, text);
	}

	create(chat, appEl, onThemeApply, onSend, fileTransferTypes = [], chatCallbacks = {}) {
		const displayName = chat.name || this.#i18n.t('unnamed');
		const el = this.#utils.mk('div', 'mapp-chat-panel');
		this.#themeManager.applyChatVars(el);
		const header = this.#utils.mk('div', 'mc-header');
		const backBtn = this.#utils.mk('button', 'mc-back-btn');
		backBtn.innerHTML = this.#icons.back();
		backBtn.addEventListener('click', () => {
			if (MessengerUtils.isMobile()) {
				if (appEl.root.classList.contains('mapp-show-chat')) {
					history.back();
				} else {
					appEl.root.classList.remove('mapp-show-chat');
					appEl.empty.hidden = false;
				}
			} else {
				appEl.root.classList.remove('mapp-show-chat');
				appEl.empty.hidden = false;
			}
		});
		const canShow = this.#canShowContactPresence();
		const avatarPresence = canShow && chat.type === 'direct' && chat.contactUserId
			? this.#presence?.get(chat.contactUserId)
			: null;
		const avatar = avatarPresence === 'online' || avatarPresence === 'idle'
			? this.#avatarBuilder.buildWithPresence(chat.id, displayName, chat.avatar || null, 32, avatarPresence)
			: this.#avatarBuilder.build(chat.id, displayName, chat.avatar || null, 32);
		const nameEl = this.#utils.mk('div', 'mc-header-name');
		nameEl.textContent = displayName;
		const subEl = this.#utils.mk('div', 'mc-header-sub');
		if (chat.type === 'direct') {
			const subText = MessengerUtils.getDirectChatHeaderSub(
				chat, avatarPresence, this.#i18n, this.#utils, canShow
			);
			subEl.textContent = subText ?? (this.#i18n.t('typeLabels')[chat.type] || '');
		} else {
			subEl.textContent = this.#i18n.t('typeLabels')[chat.type] || '';
		}
		const activityBar = this.#msgRenderer.buildActivityBar();
		const subRow = this.#utils.mk('div', 'mc-header-sub-row');
		subRow.append(subEl, activityBar);
		const nameWrap = this.#utils.mk('div', 'mc-header-name-wrap');
		nameWrap.append(nameEl, subRow);
		const profileHit = this.#utils.mk('div', 'mapp-sidebar-user mc-header-profile-hit');
		profileHit.append(avatar, nameWrap);
		const info = this.#utils.mk('div', 'mc-header-info');
		info.append(backBtn, profileHit);
		bindChatHeaderProfileClick(profileHit, chat, {
			onShowProfile: chatCallbacks.onShowProfile,
			onShowGroupProfile: chatCallbacks.onShowGroupProfile,
		});
		const menuWrap = this.#utils.mk('div', 'mc-menu-wrap');
		const dotsBtn = this.#utils.mk('button', 'mc-dots-btn');
		dotsBtn.innerHTML = this.#icons.dots();
		const dropdown = this.#buildChatMenu(chat, chatCallbacks);
		dotsBtn.addEventListener('click', e => {
			e.stopPropagation();
			if (isMobileSheetMenu()) {
				dropdown.classList.remove('mc-menu--open');
				dropdown.closeSubmenus?.();
				dropdown._dismissCleanup?.();
				dropdown._dismissCleanup = null;
				MobileBottomSheetMenu.open({
					title: chat.name || '',
					items: this.#buildChatMenuSheetItems(chat, chatCallbacks),
					themeManager: this.#themeManager,
					i18n: this.#i18n,
				});
				return;
			}
			const willOpen = !dropdown.classList.contains('mc-menu--open');
			dropdown.classList.toggle('mc-menu--open', willOpen);
			if (!willOpen) {
				dropdown.closeSubmenus?.();
			} else {
				dropdown._dismissCleanup?.();
				dropdown._dismissCleanup = attachMenuDismiss(dropdown, () => {
					dropdown.classList.remove('mc-menu--open');
					dropdown.closeSubmenus?.();
				});
			}
		});
		menuWrap.append(dotsBtn, dropdown);
		header.append(info, menuWrap);
		const activityTracker = new MessengerActivityTracker(activities => {
			this.#msgRenderer.updateActivityBar(activityBar, activities, this.#i18n);
		});
		const msgArea = this.#utils.mk('div', 'mc-messages');
		const topLoader = this.#utils.mk('div', 'mc-top-loader');
		topLoader.hidden = true;
		topLoader.appendChild(this.#utils.mk('div', 'mc-loader-spinner'));
		msgArea.appendChild(topLoader);
		const scrollDownBtn = this.#utils.mk('button', 'mc-scroll-down-btn');
		scrollDownBtn.innerHTML = `<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M5 8l5 5 5-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
		scrollDownBtn.hidden = true;
		const msgWrap = this.#utils.mk('div', 'mc-messages-wrap');
		msgWrap.append(msgArea, scrollDownBtn);
		if (this.#readGate) {
			this.#readGate.bindMsgArea(chat.id, msgArea, () => this.#chatVisibleFn?.(chat.id) ?? false);
		}
		const onActivity = (type, active) => this.#api.sendActivity(chat.id, type, active).catch(() => {});
		const replyBar = this.#buildReplyBar();
		const selectBar = this.#buildSelectionBar();
		let panelState = null;
		const fileOptions = fileTransferTypes.length > 0 ? {
			types: fileTransferTypes,
			chatId: chat.id,
			onFileUpload: (type, cId, mArea) => {
				this.#fileHandler.upload(type, cId, mArea, (bubbleEl) => {
					mArea.appendChild(bubbleEl);
					mArea.scrollTop = mArea.scrollHeight;
				}, (chatId, localId, serverMsg, el, packedText) => {
					if (panelState && chatId === panelState.chatId) {
						this.attachFileUploadMessage(panelState, localId, serverMsg, el, packedText);
					}
				});
			},
		} : null;
		const inputArea = this.#msgRenderer.buildInputArea(chat.id, msgArea, onSend, onActivity, fileOptions);
		el.append(header, msgWrap, replyBar, selectBar, inputArea);
		const state = {
			chatId: chat.id,
			el,
			msgArea,
			topLoader,
			activityBar,
			activityTracker,
			renderedIds: new Set(),
			messages: new Map(),
			pendingStatus: new Map(),
			avatarCache: new Map(),
			cacheTopIdx: 0,
			serverOffset: 0,
			hasMore: true,
			isLoading: false,
			firstLoadDone: false,
			newDividerInserted: false,
			unreadCount: chat.unreadCount || 0,
			scrollCleanup: null,
			stickyDateSep: new MessengerStickyDateSeparator(msgArea, msgWrap),
			currentUser: chatCallbacks.currentUser || { name: '', colorSeed: '' },
			replyDraft: null,
			replyBar,
			selectBar,
			selectionMode: false,
			selectedIds: new Set(),
			quoteView: false,
			quoteTargetId: null,
			cacheBottomIdx: 0,
			hasMoreNewer: false,
			inputField: inputArea.querySelector('.mc-input-field'),
			onAvatarClick: chatCallbacks.onShowProfile
				? (msg) => {
					if (!msg.senderId) return;
					chatCallbacks.onShowProfile({
						contactUserId: msg.senderId,
						name: msg.senderName,
						avatar: msg.senderAvatar,
						type: 'direct',
					});
				}
				: null,
			onEnterExtraPassword: typeof chatCallbacks.onEnterExtraPassword === 'function'
				? () => chatCallbacks.onEnterExtraPassword(chat)
				: null,
			onMarkReadIfEngaged: typeof chatCallbacks.onMarkReadIfEngaged === 'function'
				? chatCallbacks.onMarkReadIfEngaged
				: null,
		};
		panelState = state;
		this.#bindMessageInteractions(state);
		scrollDownBtn.addEventListener('click', () => {
			if (state.quoteView) {
				this.#jumpToLatest(chat.id, state);
				return;
			}
			MessengerUtils.scrollToBottom(msgArea);
			requestAnimationFrame(() => state.stickyDateSep?.refresh());
		});
		msgArea.addEventListener('scroll', () => {
			const fromBottom = msgArea.scrollHeight - msgArea.scrollTop - msgArea.clientHeight;
			scrollDownBtn.hidden = !(fromBottom > 120 || state.quoteView);
			if (fromBottom < 5 && !state.quoteView) state.stickyDateSep?.refresh();
			if (!state.firstLoadDone || state.isLoading) return;
			if (state.quoteView) {
				if (msgArea.scrollTop < 80 && state.hasMore) {
					this.#loadOlderQuoteWindow(chat.id, state);
				} else if (fromBottom < 80 && state.hasMoreNewer) {
					this.#loadNewerQuoteWindow(chat.id, state);
				}
				return;
			}
			if (msgArea.scrollTop < 80 && state.hasMore) {
				this.loadHistory(chat.id, state);
			}
		});
		document.addEventListener('click', e => {
			if (!menuWrap.contains(e.target)) {
				dropdown.classList.remove('mc-menu--open');
				dropdown.closeSubmenus?.();
				dropdown._dismissCleanup?.();
				dropdown._dismissCleanup = null;
			}
		});
		this.#refreshMessagesStatusForLoad(state, chat.id);
		return state;
	}
	#getChatMuteMenuSpec(chat) {
		const push = (typeof window !== 'undefined') ? window.SupraPush : null;
		if (!push || typeof push.isSupported !== 'function' || !push.isSupported()) return null;
		if (typeof push.setChatMuted !== 'function') return null;
		const muted = typeof push.isChatMuted === 'function' && push.isChatMuted(chat.id);
		return {
			icon: muted ? this.#icons.bell() : this.#icons.bellOff(),
			labelKey: muted ? 'unmuteNotifications' : 'muteNotifications',
			labelFallback: muted ? 'Включить уведомления' : 'Отключить уведомления',
			action: () => { try { push.setChatMuted(chat.id, !muted); } catch (_) { /* ignore */ } },
		};
	}

	#appendChatMuteMenuItem(chat, addItem) {
		const spec = this.#getChatMuteMenuSpec(chat);
		if (spec) addItem(spec.icon, spec.labelKey, spec.labelFallback, false, spec.action);
	}

	#buildChatMenu(chat, callbacks = {}) {
		const menu = this.#utils.mk('div', 'mc-menu');
		const isGroup = chat.type === 'group' || chat.type === 'public_group';

		const addItem = (icon, labelKey, labelFallback, danger, action) => {
			const item = this.#utils.mk('div', 'mc-menu-item');
			if (danger) item.classList.add('mc-menu-item--danger');
			if (icon) { const ic = this.#utils.mk('span', 'mc-menu-item-icon'); ic.innerHTML = icon; item.appendChild(ic); }
			const lbl = this.#utils.mk('span');
			lbl.textContent = this.#i18n.t(labelKey) || labelFallback;
			item.appendChild(lbl);
			item.addEventListener('click', e => { e.stopPropagation(); menu.classList.remove('mc-menu--open'); action(); });
			menu.appendChild(item);
		};

		if (isGroup && typeof callbacks.onShowGroupProfile === 'function') {
			addItem(this.#icons.profile(), 'groupProfile', this.#i18n.t('groupProfile'), false, () => callbacks.onShowGroupProfile(chat));
		} else if (!isGroup && typeof callbacks.onShowProfile === 'function') {
			addItem(this.#icons.profile(), 'showProfile', 'Профиль', false, () => callbacks.onShowProfile(chat));
		}

		this.#appendChatEncryptionMenu(menu, chat, callbacks, addItem);

		if (typeof callbacks.onClearHistory === 'function') {
			addItem(this.#icons.eraser(), 'clearHistory', 'Очистить историю', false, () => callbacks.onClearHistory(chat));
		}

		this.#appendChatMuteMenuItem(chat, addItem);

		if (isGroup) {
			if (typeof callbacks.onBlockGroup === 'function') {
				addItem(this.#icons.block(), 'blockGroup', this.#i18n.t('blockGroup'), true, () => callbacks.onBlockGroup(chat));
			}
			if (typeof callbacks.onLeaveGroup === 'function') {
				addItem(this.#icons.exitGroup(), 'leaveGroup', 'Выйти из группы', true, () => callbacks.onLeaveGroup(chat));
			}
		} else {
			if (typeof callbacks.onBlockUser === 'function') {
				addItem(this.#icons.block(), 'blockUser', this.#i18n.t('blockUser'), true, () => callbacks.onBlockUser(chat));
			}
			if (typeof callbacks.onDeleteChat === 'function') {
				addItem(this.#icons.trash(), 'deleteChat', 'Удалить чат', true, () => callbacks.onDeleteChat(chat));
			}
		}

		if (typeof menu.closeSubmenus !== 'function') menu.closeSubmenus = () => {};
		return menu;
	}

	#buildChatMenuSheetItems(chat, callbacks = {}) {
		const items = [];
		const isGroup = chat.type === 'group' || chat.type === 'public_group';

		const pushItem = (icon, labelKey, labelFallback, danger, action) => {
			items.push({
				icon,
				label: this.#i18n.t(labelKey) || labelFallback,
				danger,
				action,
			});
		};

		if (isGroup && typeof callbacks.onShowGroupProfile === 'function') {
			pushItem(this.#icons.profile(), 'groupProfile', this.#i18n.t('groupProfile'), false, () => callbacks.onShowGroupProfile(chat));
		} else if (!isGroup && typeof callbacks.onShowProfile === 'function') {
			pushItem(this.#icons.profile(), 'showProfile', 'Профиль', false, () => callbacks.onShowProfile(chat));
		}

		const encChildren = this.#buildChatEncryptionSheetChildren(chat, callbacks);
		if (encChildren.length) {
			items.push({
				icon: this.#icons.lock(),
				label: this.#i18n.t('chatEncryption'),
				children: encChildren,
			});
		}

		if (typeof callbacks.onClearHistory === 'function') {
			pushItem(this.#icons.eraser(), 'clearHistory', 'Очистить историю', false, () => callbacks.onClearHistory(chat));
		}

		{
			const mute = this.#getChatMuteMenuSpec(chat);
			if (mute) pushItem(mute.icon, mute.labelKey, mute.labelFallback, false, mute.action);
		}

		if (isGroup) {
			if (typeof callbacks.onBlockGroup === 'function') {
				pushItem(this.#icons.block(), 'blockGroup', this.#i18n.t('blockGroup'), true, () => callbacks.onBlockGroup(chat));
			}
			if (typeof callbacks.onLeaveGroup === 'function') {
				pushItem(this.#icons.exitGroup(), 'leaveGroup', 'Выйти из группы', true, () => callbacks.onLeaveGroup(chat));
			}
		} else {
			if (typeof callbacks.onBlockUser === 'function') {
				pushItem(this.#icons.block(), 'blockUser', this.#i18n.t('blockUser'), true, () => callbacks.onBlockUser(chat));
			}
			if (typeof callbacks.onDeleteChat === 'function') {
				pushItem(this.#icons.trash(), 'deleteChat', 'Удалить чат', true, () => callbacks.onDeleteChat(chat));
			}
		}

		return items;
	}

	#buildChatEncryptionSheetChildren(chat, callbacks) {
		if (typeof callbacks.onChatEncryptionSetPassword !== 'function') return [];
		const children = [];
		if (typeof callbacks.onChatEncryptionStatusText === 'function') {
			children.push({
				label: callbacks.onChatEncryptionStatusText(chat),
				hint: true,
			});
		}
		children.push({
			label: this.#i18n.t('chatEncryptionSetPassword'),
			action: () => callbacks.onChatEncryptionSetPassword(chat),
		});
		if (callbacks.onChatEncryptionHasPassword?.(chat) &&
			typeof callbacks.onChatEncryptionRemovePassword === 'function') {
			children.push({
				label: this.#i18n.t('chatEncryptionRemovePassword'),
				danger: true,
				action: () => callbacks.onChatEncryptionRemovePassword(chat),
			});
		}
		return children;
	}

	#appendChatEncryptionMenu(menu, chat, callbacks, addItem) {
		if (typeof callbacks.onChatEncryptionSetPassword !== 'function') return;

		const closeSubmenus = () => {
			menu.querySelectorAll('.mc-submenu--open')
				.forEach(el => el.classList.remove('mc-submenu--open'));
		};
		menu.closeSubmenus = closeSubmenus;

		const encItem = this.#utils.mk('div', 'mc-menu-item mc-menu-item--sub');
		if (this.#icons.lock()) {
			const ic = this.#utils.mk('span', 'mc-menu-item-icon');
			ic.innerHTML = this.#icons.lock();
			encItem.appendChild(ic);
		}
		const label = this.#utils.mk('span');
		label.textContent = this.#i18n.t('chatEncryption');
		const arrow = this.#utils.mk('span', 'mc-menu-arrow');
		arrow.innerHTML = '›';
		encItem.append(label, arrow);

		const submenu = this.#utils.mk('div', 'mc-submenu');
		if (typeof callbacks.onChatEncryptionStatusText === 'function') {
			const statusItem = this.#utils.mk('div', 'mc-menu-item mc-menu-item--hint');
			statusItem.textContent = callbacks.onChatEncryptionStatusText(chat);
			submenu.appendChild(statusItem);
		}
		const setItem = this.#utils.mk('div', 'mc-menu-item');
		setItem.textContent = this.#i18n.t('chatEncryptionSetPassword');
		setItem.addEventListener('click', e => {
			e.stopPropagation();
			menu.classList.remove('mc-menu--open');
			closeSubmenus();
			callbacks.onChatEncryptionSetPassword(chat);
		});
		submenu.appendChild(setItem);

		if (callbacks.onChatEncryptionHasPassword?.(chat) &&
			typeof callbacks.onChatEncryptionRemovePassword === 'function') {
			const removeItem = this.#utils.mk('div', 'mc-menu-item');
			removeItem.textContent = this.#i18n.t('chatEncryptionRemovePassword');
			removeItem.addEventListener('click', e => {
				e.stopPropagation();
				menu.classList.remove('mc-menu--open');
				closeSubmenus();
				callbacks.onChatEncryptionRemovePassword(chat);
			});
			submenu.appendChild(removeItem);
		}

		encItem.addEventListener('click', e => {
			e.stopPropagation();
			menu.querySelectorAll('.mc-submenu--open').forEach(el => {
				if (el !== submenu) el.classList.remove('mc-submenu--open');
			});
			submenu.classList.toggle('mc-submenu--open');
		});
		encItem.appendChild(submenu);
		menu.appendChild(encItem);
	}

	#buildReplyBar() {
		const bar = this.#utils.mk('div', 'mc-reply-bar');
		bar.hidden = true;
		const body = this.#utils.mk('div', 'mc-reply-bar-body');
		const author = this.#utils.mk('div', 'mc-reply-bar-author');
		const preview = this.#utils.mk('div', 'mc-reply-bar-preview');
		body.append(author, preview);
		const closeBtn = this.#utils.mk('button', 'mc-reply-bar-close');
		closeBtn.type = 'button';
		closeBtn.innerHTML = '×';
		bar.append(body, closeBtn);
		return bar;
	}

	#buildSelectionBar() {
		const bar = this.#utils.mk('div', 'mc-select-bar');
		bar.hidden = true;
		const countEl = this.#utils.mk('span', 'mc-select-bar-count');
		const cancelBtn = this.#utils.mk('button', 'mc-select-bar-btn');
		cancelBtn.type = 'button';
		const deleteBtn = this.#utils.mk('button', 'mc-select-bar-btn mc-select-bar-btn--danger');
		deleteBtn.type = 'button';
		bar.append(countEl, cancelBtn, deleteBtn);
		bar._countEl = countEl;
		bar._cancelBtn = cancelBtn;
		bar._deleteBtn = deleteBtn;
		return bar;
	}

	#bindMessageInteractions(state) {
		if (!state.replyBar || !state.selectBar) return;
		const closeReply = state.replyBar.querySelector('.mc-reply-bar-close');
		closeReply?.addEventListener('click', () => this.clearReplyDraft(state));

		state.selectBar._cancelBtn.textContent = this.#i18n.t('selectCancel');
		state.selectBar._deleteBtn.textContent = this.#i18n.t('selectDelete');
		state.selectBar._cancelBtn.addEventListener('click', () => this.#exitSelectionMode(state));
		state.selectBar._deleteBtn.addEventListener('click', () => this.#deleteSelectedMessages(state));
	}

	clearReplyDraft(state) {
		state.replyDraft = null;
		if (state.replyBar) state.replyBar.hidden = true;
		state.inputField?.focus();
	}

	setReplyDraft(state, msg) {
		if (!msg || msg.deletedForEveryone) return;
		const textPreview = resolveReplyTextPreview(msg);
		state.replyDraft = {
			messageId: msg.id,
			senderName: msg.senderName || '',
			textPreview,
		};
		const author = state.replyBar.querySelector('.mc-reply-bar-author');
		const prev = state.replyBar.querySelector('.mc-reply-bar-preview');
		if (author) author.textContent = state.replyDraft.senderName;
		if (prev) {
			prev.replaceChildren();
			prev.classList.remove('mc-reply-bar-preview--image');
			const previewEl = buildQuotePreviewContent({
				utils: this.#utils,
				cache: this.#cache,
				previewText: msg.text || textPreview,
				locked: false,
			});
			if (previewEl.classList.contains('mc-msg-quote-preview--image')) {
				prev.classList.add('mc-reply-bar-preview--image');
				const thumb = previewEl.querySelector('.mc-msg-quote-thumb');
				if (thumb) {
					thumb.classList.remove('mc-msg-quote-thumb');
					thumb.classList.add('mc-reply-bar-thumb');
					prev.appendChild(thumb);
				}
			} else {
				prev.textContent = previewEl.textContent;
			}
		}
		state.replyBar.hidden = false;
		state.inputField?.focus();
	}

	#clearPanelMessages(state) {
		MessengerMessageHighlight.clear(state.msgArea);
		for (const child of [...state.msgArea.children]) {
			if (child === state.topLoader) continue;
			child.remove();
		}
		state.messages.clear();
		state.renderedIds.clear();
	}

	#firstRealIndexAtOrAfter(all, fromIdx) {
		for (let i = Math.max(0, fromIdx); i < all.length; i++) {
			if (!all[i].isVirtual) return i;
		}
		return -1;
	}

	#applyQuoteWindow(state, all, targetId, hasMoreBefore, hasMoreAfter) {
		const idx = all.findIndex(m => m.id === targetId && !m.isVirtual);
		if (idx < 0) return false;

		this.#clearPanelMessages(state);
		const startIdx = MessengerUtils.findPageStart(all, idx + 1, this.#pageSize);
		const endIdx = Math.min(all.length, idx + this.#pageSize + 1);

		state.quoteView = true;
		state.quoteTargetId = targetId;
		state.cacheTopIdx = startIdx;
		state.cacheBottomIdx = endIdx;
		state.hasMore = hasMoreBefore || startIdx > 0;
		state.hasMoreNewer = hasMoreAfter || endIdx < all.length;
		state.firstLoadDone = true;
		state.newDividerInserted = false;

		const visible = all.slice(startIdx, endIdx);
		this.#renderBatch(state, visible, 'append');
		this.#recalcSeparatorsInDOM(state);
		requestAnimationFrame(() => {
			MessengerMessageHighlight.focus(state.msgArea, targetId, { temporary: true });
		});
		return true;
	}

	async #jumpToLatest(chatId, state) {
		state.quoteView = false;
		state.quoteTargetId = null;
		state.hasMoreNewer = false;
		state.cacheBottomIdx = 0;
		state.firstLoadDone = false;
		state.hasMore = true;
		state.isLoading = false;
		this.#clearPanelMessages(state);
		await this.loadHistory(chatId, state);
	}

	async #loadOlderQuoteWindow(chatId, state) {
		if (state.isLoading) return;
		state.isLoading = true;
		state.topLoader.hidden = false;
		try {
			let all = await this.#getDisplayMessages(chatId);
			if (state.cacheTopIdx > 0) {
				const startIdx = MessengerUtils.findPageStart(all, state.cacheTopIdx, this.#pageSize);
				const page = all.slice(startIdx, state.cacheTopIdx);
				state.cacheTopIdx = startIdx;
				state.hasMore = startIdx > 0;
				if (!page.length) return;
				const prevH = state.msgArea.scrollHeight;
				const prevTop = state.msgArea.scrollTop;
				this.#renderBatch(state, page, 'prepend');
				this.#recalcSeparatorsInDOM(state);
				requestAnimationFrame(() => {
					state.msgArea.scrollTop = prevTop + (state.msgArea.scrollHeight - prevH);
				});
				return;
			}
			const anchorIdx = this.#firstRealIndexAtOrAfter(all, 0);
			if (anchorIdx < 0) {
				state.hasMore = false;
				return;
			}
			const anchorId = all[anchorIdx].id;
			const around = await this.#api.getMessagesAround(chatId, anchorId, this.#pageSize, 0);
			if (around.messages.length) await this.#msgService.ingest(chatId, around.messages, this.#api);
			all = await this.#getDisplayMessages(chatId);
			const newStart = all.findIndex(m => m.id === anchorId);
			const sliceStart = MessengerUtils.findPageStart(all, newStart + 1, this.#pageSize);
			const page = all.slice(sliceStart, newStart);
			state.cacheTopIdx = sliceStart;
			state.hasMore = around.hasMoreBefore;
			if (!page.length) return;
			const prevH = state.msgArea.scrollHeight;
			const prevTop = state.msgArea.scrollTop;
			this.#renderBatch(state, page, 'prepend');
			this.#recalcSeparatorsInDOM(state);
			requestAnimationFrame(() => {
				state.msgArea.scrollTop = prevTop + (state.msgArea.scrollHeight - prevH);
			});
		} catch (e) {
			console.warn('[MessengerChatPanel] loadOlderQuoteWindow', e);
		} finally {
			state.topLoader.hidden = true;
			state.isLoading = false;
		}
	}

	async #loadNewerQuoteWindow(chatId, state) {
		if (state.isLoading) return;
		state.isLoading = true;
		try {
			const all = await this.#getDisplayMessages(chatId);
			if (state.cacheBottomIdx < all.length) {
				const endIdx = Math.min(all.length, state.cacheBottomIdx + this.#pageSize);
				const page = all.slice(state.cacheBottomIdx, endIdx);
				state.cacheBottomIdx = endIdx;
				state.hasMoreNewer = endIdx < all.length;
				if (page.length) {
					this.#renderBatch(state, page, 'append');
					this.#recalcSeparatorsInDOM(state);
				}
				return;
			}
			let anchorIdx = -1;
			for (let i = Math.min(all.length, state.cacheBottomIdx) - 1; i >= 0; i--) {
				if (!all[i].isVirtual) {
					anchorIdx = i;
					break;
				}
			}
			if (anchorIdx < 0) {
				state.hasMoreNewer = false;
				return;
			}
			const anchorId = all[anchorIdx].id;
			const around = await this.#api.getMessagesAround(chatId, anchorId, 0, this.#pageSize);
			if (around.messages.length) await this.#msgService.ingest(chatId, around.messages, this.#api);
			const merged = await this.#getDisplayMessages(chatId);
			const anchorPos = merged.findIndex(m => m.id === anchorId);
			const sliceEnd = Math.min(merged.length, anchorPos + this.#pageSize + 1);
			const page = merged.slice(anchorPos + 1, sliceEnd);
			state.cacheBottomIdx = sliceEnd;
			state.hasMoreNewer = around.hasMoreAfter;
			if (page.length) {
				this.#renderBatch(state, page, 'append');
				this.#recalcSeparatorsInDOM(state);
			}
		} catch (e) {
			console.warn('[MessengerChatPanel] loadNewerQuoteWindow', e);
		} finally {
			state.isLoading = false;
		}
	}

	async #scrollToQuotedMessage(state, messageId) {
		if (!messageId || state.isLoading) return;
		if (MessengerMessageHighlight.focus(state.msgArea, messageId, { temporary: true })) return;

		state.isLoading = true;
		state.topLoader.hidden = false;
		try {
			const anchor = await this.#msgService.resolveQuoteAnchor(
				state.chatId, messageId, this.#api, this.#pageSize
			);
			if (anchor.idx < 0) return;
			this.#applyQuoteWindow(
				state,
				anchor.all,
				messageId,
				anchor.hasMoreBefore,
				anchor.hasMoreAfter
			);
		} catch (e) {
			console.warn('[MessengerChatPanel] scrollToQuotedMessage', e);
		} finally {
			state.topLoader.hidden = true;
			state.isLoading = false;
		}
	}

	#bindMessageRowEvents(state, row, msg) {
		if (!row || row.dataset.dateSep || MessengerCustomMessage.isSystemEvent(msg)) return;
		const bubble = row.querySelector('.mc-bubble');
		if (!bubble) return;

		const openMenu = (e, fromTouch = false) => {
			if (state.selectionMode) return;
			e.preventDefault();
			e.stopPropagation();
			const currentMsg = this.#resolveRowMessage(state, row, msg);
			this.#showMessageMenu(e, state, currentMsg, row);
		};

		bubble.addEventListener('click', e => {
			if (state.selectionMode) {
				e.stopPropagation();
				this.#toggleMessageSelection(state, msg.id, row);
				return;
			}
			if (isMobileSheetMenu()) {
				openMenu(e, true);
			}
		});
		bubble.addEventListener('contextmenu', (e) => {
			if (isMobileSheetMenu()) {
				e.preventDefault();
				return;
			}
			openMenu(e, false);
		});

		const bubbleImage = bubble.querySelector('.mc-bubble-image');
		if (bubbleImage) {
			bindImageLongPressMenu(bubbleImage, (e) => openMenu(e, true));
		}

		row._msgData = msg;
	}

	#showMessageMenu(e, state, msg, row = null) {
		const isOwn = !!msg.isOwn;
		const isDeleted = !!msg.deletedForEveryone;
		const sheetItems = [];
		const push = (icon, labelKey, danger, action) => {
			sheetItems.push({
				icon,
				label: this.#i18n.t(labelKey),
				danger,
				action,
			});
		};

		if (!isDeleted) {
			if (this.#shouldOfferEnterPassword(state, msg, row)) {
				push(this.#icons.lock(), 'msgActionEnterPassword', false, () => state.onEnterExtraPassword());
			}
			if (isOwn) push(this.#icons.pencil(), 'msgActionEdit', false, () => this.#editMessage(state, msg));
			push(this.#icons.reply(), 'msgActionReply', false, () => this.setReplyDraft(state, msg));
			if (this.#api.canForwardMessage(msg)) {
				push(this.#icons.forward(), 'msgActionForward', false, () => this.#forwardMessage(state, msg));
			}
			if (msg.text) push(this.#icons.copy(), 'msgActionCopy', false, () => this.#copyMessageText(msg));
			push(this.#icons.select(), 'msgActionSelect', false, () => this.#enterSelectionMode(state, msg.id));
		}

		if (!isDeleted) {
			push(this.#icons.trash(), 'msgActionDelete', true, () => this.#deleteMessage(state, msg));
		}

		if (!sheetItems.length) return;

		const dismissMenuHighlight = () => MessengerMessageHighlight.clear(state.msgArea);

		if (isMobileSheetMenu()) {
			MobileBottomSheetMenu.open({
				title: msg.senderName || '',
				items: sheetItems,
				themeManager: this.#themeManager,
				i18n: this.#i18n,
				icons: this.#icons,
				onClose: dismissMenuHighlight,
				onSheetReady: (sheetEl) => {
					if (row) MessengerMessageHighlight.showAboveSheetMenu(row, sheetEl, state.msgArea);
				},
			});
			return;
		}

		document.querySelectorAll('.mc-msg-context-menu').forEach(m => m.remove());
		const menu = this.#utils.mk('div', 'mc-msg-context-menu mapp-chat-context-menu');
		this.#themeManager?.applyChatVars?.(menu);
		const closeMenu = () => {
			menu.remove();
			dismissMenuHighlight();
		};
		const addItem = (icon, label, danger, action) => {
			const item = this.#utils.mk('div', 'mapp-context-menu-item');
			if (danger) item.classList.add('mapp-context-menu-item--danger');
			if (icon) {
				const ic = this.#utils.mk('span', 'mapp-context-menu-item-icon');
				ic.innerHTML = icon;
				item.appendChild(ic);
			}
			const lbl = this.#utils.mk('span');
			lbl.textContent = label;
			item.appendChild(lbl);
			item.addEventListener('click', () => { closeMenu(); action(); });
			menu.appendChild(item);
		};
		sheetItems.forEach(def => {
			if (def.children?.length) {
				const subItem = this.#utils.mk('div', 'mapp-context-menu-item mapp-context-menu-item--sub');
				const ic = this.#utils.mk('span', 'mapp-context-menu-item-icon');
				ic.innerHTML = def.icon || '';
				const lbl = this.#utils.mk('span');
				lbl.textContent = def.label;
				const arrow = this.#utils.mk('span', 'mapp-context-menu-arrow');
				arrow.textContent = '›';
				subItem.append(ic, lbl, arrow);
				const subMenu = this.#utils.mk('div', 'mapp-context-submenu');
				def.children.forEach(child => {
					const cItem = this.#utils.mk('div', 'mapp-context-menu-item');
					if (child.danger) cItem.classList.add('mapp-context-menu-item--danger');
					const cLbl = this.#utils.mk('span');
					cLbl.textContent = child.label;
					cItem.appendChild(cLbl);
					cItem.addEventListener('click', () => { closeMenu(); child.action?.(); });
					subMenu.appendChild(cItem);
				});
				subItem.appendChild(subMenu);
				subItem.addEventListener('mouseenter', () => subMenu.classList.add('mapp-context-submenu--open'));
				subItem.addEventListener('mouseleave', () => subMenu.classList.remove('mapp-context-submenu--open'));
				menu.appendChild(subItem);
			} else {
				addItem(def.icon, def.label, def.danger, def.action);
			}
		});
		document.body.appendChild(menu);
		let x = e.clientX;
		let y = e.clientY;
		const mw = menu.offsetWidth;
		const mh = menu.offsetHeight;
		if (x + mw > window.innerWidth) x = window.innerWidth - mw - 4;
		if (y + mh > window.innerHeight) y = window.innerHeight - mh - 4;
		menu.style.left = x + 'px';
		menu.style.top = y + 'px';
		attachMenuDismiss(menu, closeMenu);
	}

	async #copyMessageText(msg) {
		const text = msg.text || '';
		if (!text) return;
		try {
			await navigator.clipboard.writeText(text);
		} catch (e) {
			console.warn('[MessengerChatPanel] copy', e);
		}
	}

	async #editMessage(state, msg) {
		const overlay = document.createElement('div');
		overlay.className = 'mc-dialog-overlay';
		const dialog = document.createElement('div');
		dialog.className = 'mc-dialog';
		this.#themeManager?.applyChatVars?.(dialog);
		const titleEl = document.createElement('div');
		titleEl.className = 'mc-dialog-title';
		titleEl.textContent = this.#i18n.t('editMessageTitle');
		const field = document.createElement('textarea');
		field.className = 'mc-edit-msg-field';
		field.value = msg.text || '';
		field.rows = 4;
		const actions = document.createElement('div');
		actions.className = 'mc-dialog-actions';
		const cancelBtn = document.createElement('button');
		cancelBtn.className = 'mc-dialog-btn mc-dialog-btn--cancel';
		cancelBtn.textContent = this.#i18n.t('cancel');
		const saveBtn = document.createElement('button');
		saveBtn.className = 'mc-dialog-btn mc-dialog-btn--confirm';
		saveBtn.textContent = this.#i18n.t('save');
		actions.append(cancelBtn, saveBtn);
		dialog.append(titleEl, field, actions);
		overlay.appendChild(dialog);
		document.body.appendChild(overlay);
		const close = () => overlay.remove();
		cancelBtn.addEventListener('click', close);
		overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
		saveBtn.addEventListener('click', async () => {
			const newText = field.value.trim();
			if (!newText) return;
			saveBtn.disabled = true;
			try {
				await this.#api.editMessage(state.chatId, msg.id, newText);
				msg.text = newText;
				msg.editedOn = new Date();
				const found = this.#findEntry(state, msg.id);
				if (found) {
					found.entry.data.text = newText;
					found.entry.data.editedOn = msg.editedOn;
					this.#msgRenderer.updateMsgContent(
						found.entry,
						found.entry.data,
						id => this.#scrollToQuotedMessage(state, id)
					);
				}
				close();
			} catch (err) {
				console.warn('[MessengerChatPanel] editMessage', err);
				saveBtn.disabled = false;
			}
		});
	}

	#forwardMessage(state, msg) {
		if (!this.#api.canForwardMessage(msg)) {
			MessengerDialog.alert({
				message: this.#i18n.t('forwardNotAllowed'),
				themeManager: this.#themeManager,
			});
			return;
		}
		if (!this.#forwardModal) {
			this.#forwardModal = new MessengerForwardModal(
				this.#utils, this.#icons, this.#avatarBuilder, this.#api, this.#i18n, this.#themeManager
			);
		}
		this.#forwardModal.open(async (contactIds) => {
			try {
				await this.#api.forwardMessage(state.chatId, msg.id, contactIds, msg, {
					i18n: this.#i18n,
					themeManager: this.#themeManager,
				});
			} catch (e) {
				if (e?.code !== 'send-cancelled') {
					await MessengerDialog.alert({
						message: e?.message || this.#i18n.t('forwardNotAllowed'),
						themeManager: this.#themeManager,
					});
				}
				throw e;
			}
		});
	}

	async #deleteMessage(state, msg) {
		const isOwn = !!msg.isOwn;
		let deleteForEveryone = false;
		if (isOwn) {
			const result = await MessengerDialog.confirmWithCheckbox({
				title: this.#i18n.t('deleteMessageTitle'),
				message: this.#i18n.t('deleteMessageMsg'),
				type: MessengerDialog.TYPE_DANGER,
				confirmLabel: this.#i18n.t('confirm'),
				cancelLabel: this.#i18n.t('cancel'),
				checkboxLabel: this.#i18n.t('deleteForEveryone'),
				themeManager: this.#themeManager,
			});
			if (!result?.confirmed) return;
			deleteForEveryone = !!result.checked;
		} else {
			const confirmed = await MessengerDialog.confirm({
				title: this.#i18n.t('deleteMessageTitle'),
				message: this.#i18n.t('deleteForMe'),
				type: MessengerDialog.TYPE_DANGER,
				confirmLabel: this.#i18n.t('confirm'),
				cancelLabel: this.#i18n.t('cancel'),
				themeManager: this.#themeManager,
			});
			if (!confirmed) return;
		}
		try {
			await this.#api.deleteMessage(state.chatId, msg.id, deleteForEveryone);
			if (deleteForEveryone) {
				await this.#msgService.deleteMessage(state.chatId, msg.id);
				this.deleteMessage(state, msg.id, msg.id);
			} else {
				await this.#msgService.deleteMessage(state.chatId, msg.id);
				this.deleteMessage(state, msg.id, msg.id);
			}
		} catch (e) {
			console.warn('[MessengerChatPanel] deleteMessage', e);
		}
	}

	#enterSelectionMode(state, initialId) {
		state.selectionMode = true;
		state.selectedIds.clear();
		if (initialId) state.selectedIds.add(initialId);
		state.selectBar.hidden = false;
		MessengerMessageHighlight.clear(state.msgArea);
		state.msgArea.querySelectorAll('.mc-msg-row').forEach(row => {
			const id = row.dataset.msgId;
			if (!id) return;
			row.classList.toggle('mc-msg-row--selectable', true);
			row.classList.toggle('mc-msg-row--selected', state.selectedIds.has(id));
		});
		this.#updateSelectionBar(state);
	}

	#exitSelectionMode(state) {
		state.selectionMode = false;
		state.selectedIds.clear();
		state.selectBar.hidden = true;
		state.msgArea.querySelectorAll('.mc-msg-row').forEach(row => {
			row.classList.remove('mc-msg-row--selectable', 'mc-msg-row--selected');
		});
	}

	#toggleMessageSelection(state, msgId, row) {
		if (state.selectedIds.has(msgId)) state.selectedIds.delete(msgId);
		else state.selectedIds.add(msgId);
		row?.classList.toggle('mc-msg-row--selected', state.selectedIds.has(msgId));
		this.#updateSelectionBar(state);
	}

	#updateSelectionBar(state) {
		const n = state.selectedIds.size;
		state.selectBar._countEl.textContent = `${this.#i18n.t('selectMode')}: ${n}`;
		state.selectBar._deleteBtn.disabled = n === 0;
	}

	async #deleteSelectedMessages(state) {
		const ids = [...state.selectedIds];
		if (!ids.length) return;
		const confirmed = await MessengerDialog.confirm({
			title: this.#i18n.t('deleteMessageTitle'),
			message: this.#i18n.t('deleteForMe'),
			type: MessengerDialog.TYPE_DANGER,
			confirmLabel: this.#i18n.t('confirm'),
			cancelLabel: this.#i18n.t('cancel'),
			themeManager: this.#themeManager,
		});
		if (!confirmed) return;
		for (const id of ids) {
			try {
				await this.#api.deleteMessage(state.chatId, id, false);
				await this.#msgService.deleteMessage(state.chatId, id);
				this.deleteMessage(state, id, id);
			} catch (e) {
				console.warn('[MessengerChatPanel] bulk delete', e);
			}
		}
		this.#exitSelectionMode(state);
	}

	applyMessageUpdated(state, payload) {
		const found = this.#findEntry(state, payload.messageId);
		if (!found) return;
		const data = found.entry.data;
		if (payload.deletedForEveryone) {
			data.deletedForEveryone = true;
			data.text = '';
		} else {
			data.text = payload.text ?? data.text;
			data.editedOn = payload.editedOn ? new Date(payload.editedOn) : data.editedOn;
			data.replyToMessageId = payload.replyToMessageId || data.replyToMessageId;
			data.replyToSenderName = payload.replyToSenderName || data.replyToSenderName;
			data.replyToTextPreview = payload.replyToTextPreview || data.replyToTextPreview;
			data.forwardedFromSenderName = payload.forwardedFromSenderName || data.forwardedFromSenderName;
		}
		this.#msgRenderer.updateMsgContent(
			found.entry,
			data,
			id => this.#scrollToQuotedMessage(state, id)
		);
	}

	#recalcSeparatorsInDOM(state) {
		const { msgArea, topLoader, renderedIds } = state;
		msgArea.querySelectorAll('[data-date-sep="1"]').forEach(el => {
			if (el.dataset.msgId) renderedIds.delete(el.dataset.msgId);
			el.remove();
		});
		const rows = [...msgArea.children].filter(
			el => el.dataset.msgId && !el.dataset.dateSep && el !== topLoader
		);
		let lastDayKey = null;
		for (const row of rows) {
			const ts = Number(row.dataset.msgTs);
			if (!ts) continue;
			const d = new Date(ts);
			const dayKey = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
			if (dayKey !== lastDayKey) {
				lastDayKey = dayKey;
				const sepRecord = MessengerCustomMessage.createSeparatorRecord(d);
				renderedIds.add(sepRecord.id);
				const sepEl = this.#msgRenderer.createDateSeparatorEl(sepRecord);
				msgArea.insertBefore(sepEl, row);
			}
		}
		state.stickyDateSep.reobserve();
	}
	#renderBatch(state, records, mode = 'append') {
		const fragment = document.createDocumentFragment();
		let added = false;
		for (const msg of records) {
			if (state.renderedIds.has(msg.id)) continue;
			if (!MessengerCustomMessage.isDateSeparator(msg) && !MessengerCustomMessage.isSystemEvent(msg)
				&& msg.deletedForEveryone) continue;
			state.renderedIds.add(msg.id);
			added = true;
			let el;
			if (MessengerCustomMessage.isDateSeparator(msg)) {
				el = this.#msgRenderer.createDateSeparatorEl(msg);
			} else if (MessengerCustomMessage.isSystemEvent(msg)) {
				el = this.#msgRenderer.createSystemEventEl(msg);
			} else {
				el = this.#msgRenderer.createMsgEl(
					msg,
					state.currentUser,
					state.avatarCache,
					state.onAvatarClick,
					id => this.#scrollToQuotedMessage(state, id)
				);
				this.#bindMessageRowEvents(state, el, msg);
				state.messages.set(msg.id, { data: msg, el });
			}
			fragment.appendChild(el);
		}
		if (!added) return false;
		if (mode === 'append') {
			state.msgArea.appendChild(fragment);
		} else {
			const prependAnchor = state.topLoader.nextSibling;
			state.msgArea.insertBefore(fragment, prependAnchor);
		}
		return true;
	}
	async loadHistory(chatId, state) {
		if (state.isLoading) return;
		state.isLoading = true;
		if (!state.firstLoadDone) {
			const cached = await this.#cache.getMessages(chatId);
			state.topLoader.hidden = !!cached.length;
		} else {
			state.topLoader.hidden = false;
		}
		try {
			if (!state.firstLoadDone) await this.#panelInitialLoad(chatId, state);
			else await this.#panelLoadOlderPage(chatId, state);
		} catch (e) {
			console.warn('[MessengerChatPanel] loadHistory error', e);
			state.topLoader.hidden = true;
			state.isLoading = false;
		}
	}
	#applyInitialMessages(state, chatId, all) {
		if (!all.length) {
			state.hasMore = false;
			state.firstLoadDone = true;
			state.isLoading = false;
			this.#showMessagesStatus(state, this.#i18n.t('messagesEmpty'));
			return;
		}
		this.#hideMessagesStatus(state);
		const totalReal = all.filter(m => !m.isVirtual).length;
		const startIdx = MessengerUtils.findPageStart(all, all.length, this.#pageSize);
		const visible = all.slice(startIdx);
		state.cacheTopIdx = startIdx;
		state.serverOffset = totalReal;
		state.hasMore = startIdx > 0 || totalReal >= this.#pageSize;
		if (state.unreadCount > 0 && !state.newDividerInserted) {
			const realMsgs = visible.filter(m => !m.isVirtual);
			const dividerRealIdx = realMsgs.length - state.unreadCount;
			if (dividerRealIdx > 0) {
				const firstUnreadMsg = realMsgs[dividerRealIdx];
				const splitIdx = visible.indexOf(firstUnreadMsg);
				this.#renderBatch(state, visible.slice(0, splitIdx), 'append');
				this.#insertNewMsgDivider(state.msgArea);
				this.#renderBatch(state, visible.slice(splitIdx), 'append');
				state.newDividerInserted = true;
			} else {
				this.#renderBatch(state, visible, 'append');
			}
		} else {
			this.#renderBatch(state, visible, 'append');
		}
		this.#recalcSeparatorsInDOM(state);
		state.firstLoadDone = true;
		state.isLoading = false;
		state.scrollCleanup?.();
		state.scrollCleanup = MessengerUtils.scrollToBottom(state.msgArea);
		state.onMarkReadIfEngaged?.();
	}
	async #syncNewMessagesIntoPanel(chatId, state) {
		try {
			const { messages: newMsgs } = await this.#msgService.syncNewMessages(chatId, this.#api, 50);
			for (const msg of newMsgs) {
				if (state.renderedIds.has(msg.id)) continue;
				await this.appendMsg(state, msg);
			}
			if (newMsgs.length) state.onMarkReadIfEngaged?.();
		} catch (e) {
			console.warn('[MessengerChatPanel] syncNewMessages error', e);
		}
	}
	async syncPanelMessages(chatId, state) {
		await this.#syncNewMessagesIntoPanel(chatId, state);
	}
	#reconcileVisibleOrderAfterSync(state, chatId, all) {
		const expectedIds = MessengerUtils.getExpectedVisibleMessageIds(all, state.cacheTopIdx);
		const { reordered, missingIds } = MessengerUtils.reconcileMessageDomOrder({
			msgArea: state.msgArea,
			topLoader: state.topLoader,
			expectedIds,
			all,
			onUpdateData: (id, fresh, el) => {
				const entry = state.messages.get(id);
				if (entry) {
					entry.data = fresh;
					if (entry.el) entry.el._msgData = fresh;
				} else if (el) {
					el._msgData = fresh;
				}
			},
		});
		if (missingIds.length) {
			const byId = new Map(all.map(m => [m.id, m]));
			for (const id of missingIds) {
				const msg = byId.get(id);
				if (!msg) continue;
				const idx = expectedIds.indexOf(id);
				const nextId = idx >= 0 && idx < expectedIds.length - 1 ? expectedIds[idx + 1] : null;
				const insertBefore = nextId
					? state.msgArea.querySelector(`[data-msg-id="${nextId}"]`)
					: null;
				this.#renderMessagesAt(state, [msg], insertBefore);
			}
		}
		if (reordered || missingIds.length) this.#recalcSeparatorsInDOM(state);
	}
	#renderMessagesAt(state, records, insertBeforeNode) {
		const fragment = document.createDocumentFragment();
		let added = false;
		for (const msg of records) {
			if (state.renderedIds.has(msg.id)) continue;
			if (!MessengerCustomMessage.isDateSeparator(msg) && !MessengerCustomMessage.isSystemEvent(msg)
				&& msg.deletedForEveryone) continue;
			state.renderedIds.add(msg.id);
			added = true;
			let el;
			if (MessengerCustomMessage.isDateSeparator(msg)) {
				el = this.#msgRenderer.createDateSeparatorEl(msg);
			} else if (MessengerCustomMessage.isSystemEvent(msg)) {
				el = this.#msgRenderer.createSystemEventEl(msg);
			} else {
				el = this.#msgRenderer.createMsgEl(
					msg,
					state.currentUser,
					state.avatarCache,
					state.onAvatarClick,
					id => this.#scrollToQuotedMessage(state, id)
				);
				this.#bindMessageRowEvents(state, el, msg);
				state.messages.set(msg.id, { data: msg, el });
			}
			fragment.appendChild(el);
		}
		if (!added) return false;
		if (insertBeforeNode) {
			state.msgArea.insertBefore(fragment, insertBeforeNode);
		} else {
			state.msgArea.appendChild(fragment);
		}
		return true;
	}
	async #backgroundSyncPanelMessages(chatId, state) {
		if (state._syncInFlight) return;
		state._syncInFlight = true;
		try {
			const result = await this.#msgService.syncRecentFromServer(chatId, this.#api, this.#pageSize);
			if (result.historyCleared) {
				state.msgArea.querySelectorAll('[data-msg-id]').forEach(el => el.remove());
				state.messages.clear();
				state.renderedIds.clear();
				state.firstLoadDone = false;
				this.#applyInitialMessages(state, chatId, result.all);
				return;
			}
			for (const id of result.removedIds || []) {
				this.deleteMessage(state, id, id);
			}
			this.#reconcileVisibleOrderAfterSync(state, chatId, result.all);
			state.onMarkReadIfEngaged?.();
			if (this.#api.getCrypto()?.getCustomPassword(chatId)) {
				await this.refreshProtectedMessagesDisplay(state, chatId);
			}
		} catch (e) {
			console.warn('[MessengerChatPanel] background sync error', e);
		} finally {
			state._syncInFlight = false;
		}
	}
	async #panelInitialLoad(chatId, state) {
		let all = await this.#getDisplayMessages(chatId);
		if (all.length) {
			state.topLoader.hidden = true;
			this.#applyInitialMessages(state, chatId, all);
			this.#backgroundSyncPanelMessages(chatId, state);
			return;
		}
		this.#refreshMessagesStatusForLoad(state, chatId);
		try {
			const batch = await this.#api.getMessages(chatId, 0, this.#pageSize);
			if (batch.length) await this.#msgService.ingest(chatId, batch, this.#api);
			all = await this.#getDisplayMessages(chatId);
		} catch (e) {
			console.warn('[MessengerChatPanel] initial server load error', e);
		}
		state.topLoader.hidden = true;
		if (!all.length) {
			state.hasMore = false;
			state.firstLoadDone = true;
			state.isLoading = false;
			this.#showMessagesStatus(state, this.#i18n.t('messagesEmpty'));
			return;
		}
		this.#applyInitialMessages(state, chatId, all);
		this.#backgroundSyncPanelMessages(chatId, state);
	}
	async #panelLoadOlderPage(chatId, state) {
		if (state.cacheTopIdx > 0) {
			const all = await this.#getDisplayMessages(chatId);
			const endIdx = state.cacheTopIdx;
			const startIdx = MessengerUtils.findPageStart(all, endIdx, this.#pageSize);
			const page = all.slice(startIdx, endIdx);
			if (!page.length) {
				state.hasMore = false;
				state.topLoader.hidden = true;
				state.isLoading = false;
				return;
			}
			state.cacheTopIdx = startIdx;
			if (startIdx === 0) {
				const totalReal = all.filter(m => !m.isVirtual).length;
				state.hasMore = state.serverOffset < totalReal || state.serverOffset >= this.#pageSize;
			}
			state.topLoader.hidden = true;
			const prevH = state.msgArea.scrollHeight;
			const prevTop = state.msgArea.scrollTop;
			this.#renderBatch(state, page, 'prepend');
			this.#recalcSeparatorsInDOM(state);
			state.isLoading = false;
			requestAnimationFrame(() => {
				state.msgArea.scrollTop = prevTop + (state.msgArea.scrollHeight - prevH);
			});
			return;
		}
		const serverPage = await this.#api.getMessages(chatId, state.serverOffset, this.#pageSize);
		if (!serverPage.length) {
			state.hasMore = false;
			state.topLoader.hidden = true;
			state.isLoading = false;
			return;
		}
		await this.#msgService.ingest(chatId, serverPage, this.#api);
		state.serverOffset += serverPage.length;
		if (serverPage.length < this.#pageSize) state.hasMore = false;
		const allNow = await this.#getDisplayMessages(chatId);
		const firstRenderedRealIdx = allNow.findIndex(
			m => !m.isVirtual && state.renderedIds.has(m.id)
		);
		state.topLoader.hidden = true;
		if (firstRenderedRealIdx <= 0) { state.isLoading = false; return; }
		const insertedSlice = allNow
			.slice(0, firstRenderedRealIdx)
			.filter(m => !state.renderedIds.has(m.id));
		state.cacheTopIdx = 0;
		if (!insertedSlice.length) { state.isLoading = false; return; }
		const prevH = state.msgArea.scrollHeight;
		const prevTop = state.msgArea.scrollTop;
		this.#renderBatch(state, insertedSlice, 'prepend');
		this.#recalcSeparatorsInDOM(state);
		state.isLoading = false;
		requestAnimationFrame(() => {
			state.msgArea.scrollTop = prevTop + (state.msgArea.scrollHeight - prevH);
		});
	}
	async appendMsg(state, msg) {
		this.#hideMessagesStatus(state);
		const msgArea = state.msgArea;
		const fromBottom = msgArea.scrollHeight - msgArea.scrollTop - msgArea.clientHeight;
		const shouldScroll = msg.isOwn || fromBottom < 80;
		const displayMsg = await this.#api.messageForDisplay(msg, state.chatId);
		const { separatorAdded } = await this.#msgService.ingestOne(state.chatId, msg, this.#api);
		const toRender = [];
		if (separatorAdded) toRender.push(separatorAdded);
		toRender.push(displayMsg);
		this.#renderBatch(state, toRender, 'append');
		const entry = state.messages.get(msg.id);
		if (entry) {
			entry.data = {
				...msg,
				_encText: msg._encText ?? null,
				_encReplyPreview: msg._encReplyPreview ?? null,
				text: displayMsg.text,
				replyToTextPreview: displayMsg.replyToTextPreview,
				_locked: displayMsg._locked,
			};
			if (entry.el) entry.el._msgData = entry.data;
		}
		this.#recalcSeparatorsInDOM(state);
		state.serverOffset += 1;
		if (shouldScroll) {
			state.scrollCleanup?.();
			state.scrollCleanup = MessengerUtils.scrollToBottom(msgArea);
		}
	}
	async persistMessageServerId(state, localId, serverId) {
		try {
			await this.#msgService.updateMessageServerId(state.chatId, localId, serverId);
		} catch (err) {
			console.warn('[MessengerChatPanel] persistMessageServerId error:', err);
		}
	}
	async attachFileUploadMessage(state, localId, serverMsg, el, packedText) {
		if (!serverMsg?.id || !el || !state) return;
		const ts = serverMsg.timestamp instanceof Date
			? serverMsg.timestamp.getTime()
			: new Date(serverMsg.timestamp).getTime();
		el.dataset.msgId = serverMsg.id;
		el.dataset.msgTs = String(ts);
		el.classList.remove('mc-file-upload-row');
		const msg = {
			id: serverMsg.id,
			serverId: serverMsg.id,
			text: packedText,
			isOwn: true,
			timestamp: serverMsg.timestamp || new Date(),
			status: serverMsg.status || 'sent',
			senderId: state.currentUser?.id ?? null,
			senderName: state.currentUser?.name ?? null,
			senderAvatar: state.currentUser?.avatar ?? null,
			encryptionTier: serverMsg.encryptionTier || 'basic',
		};
		state.renderedIds.add(serverMsg.id);
		state.messages.set(serverMsg.id, { data: msg, el });
		el._msgData = msg;
		try {
			await this.#msgService.confirmOptimistic(state.chatId, localId, msg);
		} catch (err) {
			console.warn('[MessengerChatPanel] attachFileUploadMessage', err);
		}
		el._uploadCtrl?.setSentStatus?.(msg.status || 'sent');
		const statusEl = el.querySelector('.mc-msg-status');
		if (statusEl && !el._uploadCtrl) this.#msgRenderer.setStatusIcon(statusEl, msg.status);
	}

	async confirmServerMessage(state, localId, serverMsg) {
		let finalStatus = serverMsg.status;
		if (state.pendingStatus && state.pendingStatus.has(serverMsg.id)) {
			finalStatus = state.pendingStatus.get(serverMsg.id) || finalStatus;
			state.pendingStatus.delete(serverMsg.id);
		}
		serverMsg.status = finalStatus;
		const found = this.#findEntry(state, localId);
		if (found) {
			const { key, entry } = found;
			entry.data.id = serverMsg.id;
			entry.data.serverId = serverMsg.id;
			entry.data.status = finalStatus;
			if (serverMsg.encryptionTier) entry.data.encryptionTier = serverMsg.encryptionTier;
			if (serverMsg._encText) entry.data._encText = serverMsg._encText;
			if (serverMsg._encReplyPreview) entry.data._encReplyPreview = serverMsg._encReplyPreview;
			const display = await this.#api.messageForDisplay(entry.data, state.chatId);
			entry.data.text = display.text;
			entry.data.replyToTextPreview = display.replyToTextPreview;
			entry.data._locked = display._locked;
			if (entry.el) {
				entry.el.dataset.msgId = serverMsg.id;
				const statusEl = entry.el.querySelector('.mc-msg-status');
				if (statusEl) this.#msgRenderer.setStatusIcon(statusEl, finalStatus);
				this.#msgRenderer.refreshMessageTierLock(entry.el, entry.data);
				this.#msgRenderer.updateMsgContent(
					entry,
					entry.data,
					id => this.#scrollToQuotedMessage(state, id)
				);
				entry.el._msgData = entry.data;
			}
			state.messages.delete(key);
			state.messages.set(serverMsg.id, entry);
			if (state.renderedIds) {
				state.renderedIds.delete(localId);
				state.renderedIds.add(serverMsg.id);
			}
		}
		try {
			await this.#msgService.confirmOptimistic(state.chatId, localId, serverMsg);
		} catch (err) {
			console.warn('[MessengerChatPanel] confirmServerMessage error:', err);
		}
	}
	async persistMessageStatus(state, messageId, status) {
		try {
			await this.#msgService.syncMessageStatus(state.chatId, messageId, status);
		} catch (err) {
			console.warn('[MessengerChatPanel] persistMessageStatus error:', err);
		}
	}
	#findEntry(state, id) {
		const direct = state.messages.get(id);
		if (direct) return { key: id, entry: direct };
		for (const [key, entry] of state.messages) {
			if (entry.data.serverId === id) return { key, entry };
		}
		return null;
	}
	updateMsgProperty(state, msgId, property, value) {
		const found = this.#findEntry(state, msgId);
		if (!found) return;
		const { key, entry } = found;
		entry.data[property] = value;
		if (property === 'serverId') state.messages.set(value, entry);
		if (key !== msgId) state.messages.set(key, entry);
	}
	updateMsgStatus(state, msgId, status) {
		const found = this.#findEntry(state, msgId);
		if (!found) {
			if (state.pendingStatus) state.pendingStatus.set(msgId, status);
			return;
		}
		found.entry.data.status = status;
		const el = found.entry.el.querySelector('.mc-msg-status');
		if (el) this.#msgRenderer.setStatusIcon(el, status);
	}
	updateActivity(state, userId, userName, activityType, active) {
		state.activityTracker?.update(userId, userName, activityType, active);
	}
	deleteMessage(state, storedId, originalId) {
		const found = this.#findEntry(state, storedId) ?? this.#findEntry(state, originalId);
		if (found) {
			const { key, entry } = found;
			state.messages.delete(key);
			if (entry.data.serverId) state.messages.delete(entry.data.serverId);
			state.messages.delete(storedId);
			state.messages.delete(originalId);
			state.renderedIds.delete(key);
			state.renderedIds.delete(storedId);
			state.renderedIds.delete(originalId);
			if (entry.data.serverId) state.renderedIds.delete(entry.data.serverId);
		} else {
			state.renderedIds.delete(storedId);
			state.renderedIds.delete(originalId);
		}
		const el =
			state.msgArea.querySelector(`[data-msg-id="${storedId}"]`) ||
			state.msgArea.querySelector(`[data-msg-id="${originalId}"]`);
		if (!el) return;
		const dateSeparatorEl = el.previousElementSibling;
		el.remove();
		if (dateSeparatorEl?.dataset.dateSep === '1') {
			const nextElement = dateSeparatorEl.nextElementSibling;
			const isOrphaned =
				!nextElement ||
				nextElement.dataset.dateSep === '1' ||
				nextElement === state.topLoader;
			if (isOrphaned) {
				if (dateSeparatorEl.dataset.msgId) state.renderedIds.delete(dateSeparatorEl.dataset.msgId);
				dateSeparatorEl.remove();
			}
		}
		if (state.unreadCount > 0) state.unreadCount = Math.max(0, state.unreadCount - 1);
		state.stickyDateSep?.reobserve();
	}
	destroyPanel(state) {
		if (state?.selectionMode) this.#exitSelectionMode(state);
		MessengerMessageHighlight.clear(state?.msgArea);
		state.scrollCleanup?.();
		state.scrollCleanup = null;
		state.stickyDateSep?.destroy();
		state.stickyDateSep = null;
		state.activityTracker?.destroy();
	}

	clearChatState(state) {
		if (!state) return;
		if (state.msgArea) {
			state.msgArea.innerHTML = '';
			const topLoader = this.#utils.mk('div', 'mc-top-loader');
			topLoader.hidden = true;
			topLoader.appendChild(this.#utils.mk('div', 'mc-loader-spinner'));
			state.msgArea.appendChild(topLoader);
			state.topLoader = topLoader;
		}
		state.messages.clear();
		state.renderedIds.clear();
		state.pendingStatus.clear();
		state.cacheTopIdx = 0;
		state.serverOffset = 0;
		state.hasMore = true;
		state.isLoading = false;
		state.firstLoadDone = false;
		state.newDividerInserted = false;
		state.quoteView = false;
		state.quoteTargetId = null;
		state.cacheBottomIdx = 0;
		state.hasMoreNewer = false;
		this.#msgService.resetChat(state.chatId);
	}
	#insertNewMsgDivider(msgArea) {
		const wrap = this.#utils.mk('div', 'mc-new-msg-divider');
		const pill = this.#utils.mk('span', 'mc-new-msg-divider-pill');
		pill.textContent = this.#i18n.t('newMessages') || 'Новые сообщения';
		wrap.appendChild(pill);
		msgArea.appendChild(wrap);
	}
}

class MessengerChatView {
	#utils;
	#icons;
	#avatarBuilder;
	#msgRenderer;
	#themeManager;
	#api;
	#cache;
	#msgService;
	#i18n;
	#options;
	#pageSize;
	#fileHandler;
	#chatMeta = null;
	#renderedIds = new Set();
	#messages = new Map();
	#pendingStatus = new Map();
	#avatarCache = new Map();
	#cacheTopIdx = 0;
	#serverOffset = 0;
	#isLoadingHist = false;
	#hasMoreHist = true;
	#menuOpen = false;
	#currentUser = { name: '…', colorSeed: 'default' };
	#activityTracker = null;
	#firstLoadDone = false;
	#newMsgDividerInserted = false;
	#popstateHandler = null;
	#viewportDestroy = null;
	#fetchAbortController = null;
	#scrollCleanup = null;
	#stickyDateSep = null;
	#readGate;
	el = {};
	constructor(utils, icons, avatarBuilder, msgRenderer, themeManager, api, i18n, options, pageSize = 20, cache = null, readGate = null) {
		this.#readGate = readGate || new MessengerChatReadGate();
		this.#utils = utils;
		this.#icons = icons;
		this.#avatarBuilder = avatarBuilder;
		this.#msgRenderer = msgRenderer;
		this.#themeManager = themeManager;
		this.#api = api;
		this.#cache = cache;
		this.#msgService = new MessengerMessageService(cache);
		this.#i18n = i18n;
		this.#options = options;
		this.#pageSize = pageSize;
		this.#fileHandler = new MessengerFileHandler(utils, icons, i18n, api, cache);
	}
	setCurrentUser(user) { this.#currentUser = user; }
	getCurrentUser() { return this.#currentUser; }
	get chatMeta() { return this.#chatMeta; }

	markReadIfEngaged() {
		const chatId = this.#chatMeta?.id;
		if (!chatId) return;
		if (!this.#readGate.shouldMarkRead(chatId, {
			isActiveChat: true,
			isChatVisible: typeof document !== 'undefined' && document.visibilityState !== 'hidden',
		})) return;
		this.#api.markRead(chatId).catch(() => {});
	}
	renderPlaceholder(container, chatName) {
		const el = this.#utils.mk('div', 'mc-placeholder');
		el.textContent = this.#i18n.t('loadingChat', chatName);
		container.appendChild(el);
	}
	renderError(container, chatName, errorMsg) {
		const el = this.#utils.mk('div', 'mc-error');
		const title = this.#utils.mk('b');
		title.textContent = this.#i18n.t('chatOpenError', chatName);
		const details = this.#utils.mk('span');
		details.textContent = errorMsg || '';
		el.append(title, details);
		container.appendChild(el);
	}
	render(container, chatMeta) {
		this.#chatMeta = chatMeta;
		this.#fetchAbortController = new AbortController();
		const root = this.#utils.mk('div', 'mc-root');
		const header = this.#buildHeader();
		const messages = this.#utils.mk('div', 'mc-messages');
		const topLoader = this.#utils.mk('div', 'mc-top-loader');
		topLoader.hidden = true;
		topLoader.appendChild(this.#utils.mk('div', 'mc-loader-spinner'));
		messages.appendChild(topLoader);
		const scrollDownBtn = this.#utils.mk('button', 'mc-scroll-down-btn');
		scrollDownBtn.innerHTML = `<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M5 8l5 5 5-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
		scrollDownBtn.hidden = true;
		scrollDownBtn.addEventListener('click', () => {
			this.#scrollCleanup?.();
			this.#scrollCleanup = MessengerUtils.scrollToBottom(messages);
			requestAnimationFrame(() => this.#stickyDateSep?.refresh());
		});
		const msgWrap = this.#utils.mk('div', 'mc-messages-wrap');
		msgWrap.append(messages, scrollDownBtn);
		this.#readGate.recordEngagement(chatMeta.id);
		this.#readGate.bindMsgArea(chatMeta.id, messages, () =>
			typeof document !== 'undefined' && document.visibilityState !== 'hidden');
		const fileTransferTypes = this.#options.fileTransferTypes || [];
		const fileOptions = fileTransferTypes.length > 0 ? {
			types: fileTransferTypes,
			chatId: chatMeta.id,
			onFileUpload: (type, cId, mArea) => {
				this.#fileHandler.upload(type, cId, mArea, (bubbleEl) => {
					mArea.appendChild(bubbleEl);
					mArea.scrollTop = mArea.scrollHeight;
				}, (chatId, localId, serverMsg, el, packedText) => {
					if (chatId === this.#chatMeta?.id) {
						this.#attachFileUploadMessage(localId, serverMsg, el, packedText);
					}
				});
			},
		} : null;
		const inputArea = this.#msgRenderer.buildInputArea(
			chatMeta.id, messages,
			(chatId, field, msgArea) => this.#handleSend(chatId, field, msgArea),
			null, fileOptions
		);
		root.append(header, msgWrap, inputArea);
		container.appendChild(root);
		this.#themeManager.applyChatVars(root);
		Object.assign(this.el, { root, messages, topLoader });
		this.#stickyDateSep = new MessengerStickyDateSeparator(messages, msgWrap);
		messages.addEventListener('scroll', () => {
			const fromBottom = messages.scrollHeight - messages.scrollTop - messages.clientHeight;
			scrollDownBtn.hidden = fromBottom <= 120;
			if (fromBottom < 5) this.#stickyDateSep?.refresh();
			if (messages.scrollTop < 80 && !this.#isLoadingHist && this.#hasMoreHist && this.#firstLoadDone)
				this.loadHistoryChunk();
		});
		document.addEventListener('click', e => {
			const menuWrap = this.el.root?.querySelector('.mc-menu-wrap');
			if (!menuWrap || !menuWrap.contains(e.target)) this.#closeMenus();
		});
		this.#popstateHandler = () => {
			// Оверлеи закрывает глобальный слушатель; здесь только проверяем флаг.
			if (messengerPopstateWasConsumed()) return;
			if (!MessengerUtils.isMobile()) return;
			if (!messengerHistoryHasStackedOverlay() && typeof this.#options.onBack === 'function') {
				this.#options.onBack();
			}
		};
		window.addEventListener('popstate', this.#popstateHandler);
		if (MessengerUtils.isMobile()) {
			this.#viewportDestroy = MessengerUtils.initMobileKeyboardLayout(root, { mode: 'height' });
		}
	}
	#recalcSeparatorsInDOM() {
		const messages = this.el.messages;
		const topLoader = this.el.topLoader;
		messages.querySelectorAll('[data-date-sep="1"]').forEach(el => {
			if (el.dataset.msgId) this.#renderedIds.delete(el.dataset.msgId);
			el.remove();
		});
		const rows = [...messages.children].filter(
			el => el.dataset.msgId && !el.dataset.dateSep && el !== topLoader
		);
		let lastDayKey = null;
		for (const row of rows) {
			const ts = Number(row.dataset.msgTs);
			if (!ts) continue;
			const d = new Date(ts);
			const dayKey = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
			if (dayKey !== lastDayKey) {
				lastDayKey = dayKey;
				const sepRecord = MessengerCustomMessage.createSeparatorRecord(d);
				this.#renderedIds.add(sepRecord.id);
				const sepEl = this.#msgRenderer.createDateSeparatorEl(sepRecord);
				messages.insertBefore(sepEl, row);
			}
		}
		this.#stickyDateSep?.reobserve();
	}
	#renderBatch(records, mode = 'append') {
		const fragment = document.createDocumentFragment();
		let added = false;
		for (const msg of records) {
			if (this.#renderedIds.has(msg.id)) continue;
			this.#renderedIds.add(msg.id);
			added = true;
			let el;
			if (MessengerCustomMessage.isDateSeparator(msg)) {
				el = this.#msgRenderer.createDateSeparatorEl(msg);
			} else if (MessengerCustomMessage.isSystemEvent(msg)) {
				el = this.#msgRenderer.createSystemEventEl(msg);
			} else {
				el = this.#msgRenderer.createMsgEl(msg, this.#currentUser, this.#avatarCache);
				this.#messages.set(msg.id, { data: msg, el });
			}
			fragment.appendChild(el);
		}
		if (!added) return false;
		if (mode === 'append') {
			this.el.messages.appendChild(fragment);
		} else {
			const prependAnchor = this.el.topLoader.nextSibling;
			this.el.messages.insertBefore(fragment, prependAnchor);
		}
		return true;
	}
	async loadHistoryChunk() {
		if (this.#isLoadingHist) return;
		this.#isLoadingHist = true;
		if (!this.#firstLoadDone) {
			const cached = await this.#cache.getMessages(this.#chatMeta.id);
			this.#el('topLoader').hidden = !!cached.length;
		} else {
			this.#el('topLoader').hidden = false;
		}
		try {
			if (!this.#firstLoadDone) await this.#initialLoad();
			else await this.#loadOlderPage();
		} catch (e) {
			console.warn('[MessengerChatView] loadHistoryChunk error', e);
			this.#el('topLoader').hidden = true;
			this.#isLoadingHist = false;
		}
	}
	#applyInitialMessages(all) {
		if (!all.length) {
			this.#hasMoreHist = false;
			this.#firstLoadDone = true;
			this.#isLoadingHist = false;
			return;
		}
		const totalReal = all.filter(m => !m.isVirtual).length;
		const startIdx = MessengerUtils.findPageStart(all, all.length, this.#pageSize);
		const visible = all.slice(startIdx);
		this.#cacheTopIdx = startIdx;
		this.#serverOffset = totalReal;
		this.#hasMoreHist = startIdx > 0 || totalReal >= this.#pageSize;
		const unreadCount = this.#options.unreadCount || 0;
		if (unreadCount > 0 && !this.#newMsgDividerInserted) {
			const idx = visible.findIndex(m => !m.isVirtual && !m.isOwn);
			if (idx > 0) {
				this.#renderBatch(visible.slice(0, idx), 'append');
				this.#insertNewMsgDivider();
				this.#renderBatch(visible.slice(idx), 'append');
				this.#newMsgDividerInserted = true;
			} else {
				this.#renderBatch(visible, 'append');
			}
		} else {
			this.#renderBatch(visible, 'append');
		}
		this.#recalcSeparatorsInDOM();
		this.#firstLoadDone = true;
		this.#isLoadingHist = false;
		this.#scrollCleanup?.();
		this.#scrollCleanup = MessengerUtils.scrollToBottom(this.el.messages);
		this.markReadIfEngaged();
	}
	async #syncNewMessagesIntoView() {
		const chatId = this.#chatMeta.id;
		try {
			const { messages: newMsgs } = await this.#msgService.syncNewMessages(chatId, this.#api, 50);
			for (const msg of newMsgs) {
				if (this.#renderedIds.has(msg.id)) continue;
				await this.receiveMessage(msg);
			}
		} catch (e) {
			console.warn('[MessengerChatView] syncNewMessages error', e);
		}
	}
	#reconcileVisibleOrderAfterSync(all) {
		const expectedIds = MessengerUtils.getExpectedVisibleMessageIds(all, this.#cacheTopIdx);
		const { reordered, missingIds } = MessengerUtils.reconcileMessageDomOrder({
			msgArea: this.el.messages,
			topLoader: this.el.topLoader,
			expectedIds,
			all,
			onUpdateData: (id, fresh, el) => {
				const entry = this.#messages.get(id);
				if (entry) {
					entry.data = fresh;
					if (entry.el) entry.el._msgData = fresh;
				} else if (el) {
					el._msgData = fresh;
				}
			},
		});
		if (missingIds.length) {
			const byId = new Map(all.map(m => [m.id, m]));
			for (const id of missingIds) {
				const msg = byId.get(id);
				if (!msg) continue;
				const idx = expectedIds.indexOf(id);
				const nextId = idx >= 0 && idx < expectedIds.length - 1 ? expectedIds[idx + 1] : null;
				const insertBefore = nextId
					? this.el.messages.querySelector(`[data-msg-id="${nextId}"]`)
					: null;
				this.#renderMessagesAt([msg], insertBefore);
			}
		}
		if (reordered || missingIds.length) this.#recalcSeparatorsInDOM();
	}
	#renderMessagesAt(records, insertBeforeNode) {
		const fragment = document.createDocumentFragment();
		let added = false;
		for (const msg of records) {
			if (this.#renderedIds.has(msg.id)) continue;
			this.#renderedIds.add(msg.id);
			added = true;
			let el;
			if (MessengerCustomMessage.isDateSeparator(msg)) {
				el = this.#msgRenderer.createDateSeparatorEl(msg);
			} else if (MessengerCustomMessage.isSystemEvent(msg)) {
				el = this.#msgRenderer.createSystemEventEl(msg);
			} else {
				el = this.#msgRenderer.createMsgEl(msg, this.#currentUser, this.#avatarCache);
				this.#messages.set(msg.id, { data: msg, el });
			}
			fragment.appendChild(el);
		}
		if (!added) return false;
		if (insertBeforeNode) {
			this.el.messages.insertBefore(fragment, insertBeforeNode);
		} else {
			this.el.messages.appendChild(fragment);
		}
		return true;
	}
	async #backgroundSyncChatMessages() {
		if (this._syncInFlight) return;
		this._syncInFlight = true;
		const chatId = this.#chatMeta.id;
		try {
			const result = await this.#msgService.syncRecentFromServer(chatId, this.#api, this.#pageSize);
			if (result.historyCleared) {
				this.el.messages.querySelectorAll('[data-msg-id]').forEach(el => el.remove());
				this.#messages.clear();
				this.#renderedIds.clear();
				this.#firstLoadDone = false;
				this.#applyInitialMessages(result.all);
				return;
			}
			for (const id of result.removedIds || []) {
				this.deleteMessage(id, id);
			}
			this.#reconcileVisibleOrderAfterSync(result.all);
		} catch (e) {
			console.warn('[MessengerChatView] background sync error', e);
		} finally {
			this._syncInFlight = false;
		}
	}
	async #initialLoad() {
		const chatId = this.#chatMeta.id;
		let all = await this.#msgService.getDisplayMessages(chatId, this.#api);
		if (all.length) {
			this.#el('topLoader').hidden = true;
			this.#applyInitialMessages(all);
			this.#backgroundSyncChatMessages();
			return;
		}
		try {
			const batch = await this.#api.getMessages(chatId, 0, this.#pageSize);
			if (batch.length) await this.#msgService.ingest(chatId, batch, this.#api);
			all = await this.#msgService.getDisplayMessages(chatId, this.#api);
		} catch (e) {
			console.warn('[MessengerChatView] initial server load error', e);
		}
		this.#el('topLoader').hidden = true;
		if (!all.length) {
			this.#hasMoreHist = false;
			this.#firstLoadDone = true;
			this.#isLoadingHist = false;
			return;
		}
		this.#applyInitialMessages(all);
		this.#backgroundSyncChatMessages();
	}
	async #loadOlderPage() {
		const chatId = this.#chatMeta.id;
		if (this.#cacheTopIdx > 0) {
			const all = await this.#msgService.getDisplayMessages(chatId, this.#api);
			const endIdx = this.#cacheTopIdx;
			const startIdx = MessengerUtils.findPageStart(all, endIdx, this.#pageSize);
			const page = all.slice(startIdx, endIdx);
			if (!page.length) {
				this.#hasMoreHist = false;
				this.#el('topLoader').hidden = true;
				this.#isLoadingHist = false;
				return;
			}
			this.#cacheTopIdx = startIdx;
			if (startIdx === 0) {
				const totalReal = all.filter(m => !m.isVirtual).length;
				this.#hasMoreHist = this.#serverOffset < totalReal || this.#serverOffset >= this.#pageSize;
			}
			this.#el('topLoader').hidden = true;
			const prevH = this.el.messages.scrollHeight;
			const prevTop = this.el.messages.scrollTop;
			this.#renderBatch(page, 'prepend');
			this.#recalcSeparatorsInDOM();
			this.#isLoadingHist = false;
			requestAnimationFrame(() => {
				this.el.messages.scrollTop = prevTop + (this.el.messages.scrollHeight - prevH);
			});
			return;
		}
		const serverPage = await this.#api.getMessages(chatId, this.#serverOffset, this.#pageSize);
		if (!serverPage.length) {
			this.#hasMoreHist = false;
			this.#el('topLoader').hidden = true;
			this.#isLoadingHist = false;
			return;
		}
		await this.#msgService.ingest(chatId, serverPage, this.#api);
		this.#serverOffset += serverPage.length;
		if (serverPage.length < this.#pageSize) this.#hasMoreHist = false;
		const allNow = await this.#msgService.getDisplayMessages(chatId, this.#api);
		const firstRenderedRealIdx = allNow.findIndex(
			m => !m.isVirtual && this.#renderedIds.has(m.id)
		);
		this.#el('topLoader').hidden = true;
		if (firstRenderedRealIdx <= 0) { this.#isLoadingHist = false; return; }
		const insertedSlice = allNow
			.slice(0, firstRenderedRealIdx)
			.filter(m => !this.#renderedIds.has(m.id));
		this.#cacheTopIdx = 0;
		if (!insertedSlice.length) { this.#isLoadingHist = false; return; }
		const prevH = this.el.messages.scrollHeight;
		const prevTop = this.el.messages.scrollTop;
		this.#renderBatch(insertedSlice, 'prepend');
		this.#recalcSeparatorsInDOM();
		this.#isLoadingHist = false;
		requestAnimationFrame(() => {
			this.el.messages.scrollTop = prevTop + (this.el.messages.scrollHeight - prevH);
		});
	}
	async receiveOwnMessage(msg) {
		const meId = this.#currentUser?.id;
		if (meId && msg.senderId === meId) msg.isOwn = true;
		if (this.#renderedIds.has(msg.id) || this.el.messages?.querySelector(`[data-msg-id="${msg.id}"]`)) {
			return;
		}
		const uploadRow = this.el.messages?.querySelector(
			'.mc-file-upload-row[data-local-upload-id]:not([data-msg-id])'
		);
		if (uploadRow && msg.isOwn) {
			await this.#attachFileUploadMessage(
				uploadRow.dataset.localUploadId,
				msg,
				uploadRow,
				msg.text
			);
			return;
		}
		if (this.#resolveMessageEntry(msg.id)) {
			return this.receiveMessage(msg);
		}
		const pending = [...this.#messages.values()].find((e) => {
			const d = e.data;
			return d?.isOwn && MessengerUtils.isLocalMessageId(d.id) && !d.serverId;
		});
		if (pending) {
			await this.confirmMessage(pending.data.id, msg);
			return;
		}
		return this.receiveMessage(msg);
	}

	applyMessageUpdated(payload) {
		const found = this.#resolveMessageEntry(payload?.messageId);
		if (!found) return;
		const data = found.entry.data;
		if (payload.deletedForEveryone) {
			data.deletedForEveryone = true;
			data.text = '';
		} else {
			data.text = payload.text ?? data.text;
			data.editedOn = payload.editedOn ? new Date(payload.editedOn) : data.editedOn;
			data.replyToMessageId = payload.replyToMessageId || data.replyToMessageId;
			data.replyToSenderName = payload.replyToSenderName || data.replyToSenderName;
			data.replyToTextPreview = payload.replyToTextPreview || data.replyToTextPreview;
			data.forwardedFromSenderName = payload.forwardedFromSenderName || data.forwardedFromSenderName;
		}
		this.#msgRenderer.updateMsgContent(found.entry, data, null);
	}

	async receiveMessage(msg) {
		if (this.#renderedIds.has(msg.id) || this.el.messages?.querySelector(`[data-msg-id="${msg.id}"]`)) {
			return;
		}
		this.#activityTracker?.update(msg.senderId, msg.senderName, 'typing', false);
		this.#updateAvatarCache(msg);
		const atBottom =
			this.el.messages.scrollHeight - this.el.messages.scrollTop - this.el.messages.clientHeight < 60;
		const displayMsg = await this.#api.messageForDisplay(msg, this.#chatMeta.id);
		const { separatorAdded } = await this.#msgService.ingestOne(this.#chatMeta.id, msg);
		const toRender = [];
		if (separatorAdded) toRender.push(separatorAdded);
		toRender.push(displayMsg);
		this.#renderBatch(toRender, 'append');
		this.#recalcSeparatorsInDOM();
		this.#serverOffset += 1;
		if (atBottom) {
			this.#scrollCleanup?.();
			this.#scrollCleanup = MessengerUtils.scrollToBottom(this.el.messages);
		}
	}
	receiveActivity(userId, userName, activityType, active) {
		if (!activityType) return;
		this.#activityTracker?.update(userId, userName, activityType, !!active);
	}
	async #attachFileUploadMessage(localId, serverMsg, el, packedText) {
		if (!serverMsg?.id || !el) return;
		const ts = serverMsg.timestamp instanceof Date
			? serverMsg.timestamp.getTime()
			: new Date(serverMsg.timestamp).getTime();
		el.dataset.msgId = serverMsg.id;
		el.dataset.msgTs = String(ts);
		el.classList.remove('mc-file-upload-row');
		const msg = {
			id: serverMsg.id,
			serverId: serverMsg.id,
			text: packedText,
			isOwn: true,
			timestamp: serverMsg.timestamp || new Date(),
			status: serverMsg.status || 'sent',
			senderId: this.#currentUser?.id ?? null,
			senderName: this.#currentUser?.name ?? null,
			senderAvatar: this.#currentUser?.avatar ?? null,
			encryptionTier: serverMsg.encryptionTier || 'basic',
		};
		this.#renderedIds.add(serverMsg.id);
		this.#messages.set(serverMsg.id, { data: msg, el });
		el._msgData = msg;
		el._uploadCtrl?.setSentStatus?.(msg.status || 'sent');
		try {
			await this.#msgService.confirmOptimistic(this.#chatMeta.id, localId, msg);
		} catch (err) {
			console.warn('[MessengerChatView] attachFileUploadMessage', err);
		}
	}

	async confirmMessage(localId, serverMsg) {
		let finalStatus = serverMsg.status || 'sent';
		if (this.#pendingStatus.has(serverMsg.id)) {
			finalStatus = this.#pendingStatus.get(serverMsg.id) || finalStatus;
			this.#pendingStatus.delete(serverMsg.id);
		}
		serverMsg = { ...serverMsg, status: finalStatus };
		await this.#msgService.confirmOptimistic(this.#chatMeta.id, localId, serverMsg);
		const entry = this.#messages.get(localId);
		if (!entry) return;
		this.#messages.delete(localId);
		this.#renderedIds.delete(localId);
		entry.data = {
			...entry.data,
			...serverMsg,
			isOwn: true,
			encryptionTier: serverMsg.encryptionTier || entry.data.encryptionTier,
		};
		entry.el.dataset.msgId = serverMsg.id;
		const ts = serverMsg.timestamp instanceof Date
			? serverMsg.timestamp.getTime()
			: new Date(serverMsg.timestamp).getTime();
		entry.el.dataset.msgTs = String(ts);
		this.#renderedIds.add(serverMsg.id);
		this.#messages.set(serverMsg.id, entry);
		this.updateMessageStatus(serverMsg.id, finalStatus);
		this.#msgRenderer.refreshMessageTierLock(entry.el, entry.data);
	}
	#resolveMessageEntry(id) {
		const direct = this.#messages.get(id);
		if (direct) return { key: id, entry: direct };
		for (const [key, entry] of this.#messages) {
			if (entry.data.serverId === id) return { key, entry };
		}
		return null;
	}
	updateMessageStatus(msgId, status) {
		const found = this.#resolveMessageEntry(msgId);
		if (!found) {
			this.#pendingStatus.set(msgId, status);
			return;
		}
		found.entry.data.status = status;
		const el = found.entry.el.querySelector('.mc-msg-status');
		if (el) this.#msgRenderer.setStatusIcon(el, status);
	}
	deleteMessage(storedId, originalId) {
		const found =
			this.#resolveMessageEntry(storedId) ??
			this.#resolveMessageEntry(originalId);
		if (found) {
			const { key, entry } = found;
			this.#messages.delete(key);
			this.#messages.delete(storedId);
			this.#messages.delete(originalId);
			if (entry.data.serverId) this.#messages.delete(entry.data.serverId);
			this.#renderedIds.delete(key);
			this.#renderedIds.delete(storedId);
			this.#renderedIds.delete(originalId);
			if (entry.data.serverId) this.#renderedIds.delete(entry.data.serverId);
		} else {
			this.#renderedIds.delete(storedId);
			this.#renderedIds.delete(originalId);
		}
		const msgArea = this.el.messages;
		if (!msgArea) return;
		const el =
			msgArea.querySelector(`[data-msg-id="${storedId}"]`) ||
			msgArea.querySelector(`[data-msg-id="${originalId}"]`);
		if (!el) return;
		const dateSeparatorEl = el.previousElementSibling;
		el.remove();
		if (dateSeparatorEl?.dataset.dateSep === '1') {
			const nextElement = dateSeparatorEl.nextElementSibling;
			const isOrphaned =
				!nextElement ||
				nextElement.dataset.dateSep === '1' ||
				nextElement === this.el.topLoader;
			if (isOrphaned) {
				if (dateSeparatorEl.dataset.msgId) this.#renderedIds.delete(dateSeparatorEl.dataset.msgId);
				dateSeparatorEl.remove();
			}
		}
		this.#stickyDateSep?.reobserve();
	}
	async #handleSend(chatId, field, msgArea) {
		const text = field.value.trim();
		if (!text) return;
		field.value = '';
		field.style.height = '';
		field.rows = 1;
		const localId = this.#utils.guid();
		let outgoingPrep = { encryptionTier: 'basic' };
		let resolved = { tier: 'basic' };
		try {
			resolved = await this.#api.resolveOutgoingEncryption(chatId, {
				themeManager: this.#themeManager,
				i18n: this.#i18n,
			});
			if (resolved.cancelled) {
				field.value = text;
				return;
			}
			outgoingPrep = await this.#api.prepareOutgoingFields(chatId, text, {
				_resolvedTier: resolved,
				themeManager: this.#themeManager,
				i18n: this.#i18n,
			});
		} catch (e) {
			if (e?.code === 'send-cancelled') {
				field.value = text;
				return;
			}
			console.warn('[MessengerChatView] prepareOutgoingFields', e);
			field.value = text;
			return;
		}
		const optimistic = {
			id: localId,
			isOwn: true,
			text,
			timestamp: new Date(),
			status: 'sending',
			encryptionTier: outgoingPrep.encryptionTier || 'basic',
			_encText: outgoingPrep._encText || null,
			_encReplyPreview: outgoingPrep._encReplyPreview || null,
		};
		const displayMsg = await this.#api.messageForDisplay(optimistic, chatId);
		const { separatorAdded } = await this.#msgService.ingestOne(chatId, optimistic);
		const toRender = [];
		if (separatorAdded) toRender.push(separatorAdded);
		toRender.push(displayMsg);
		this.#renderBatch(toRender, 'append');
		this.#recalcSeparatorsInDOM();
		this.#serverOffset += 1;
		msgArea.scrollTop = msgArea.scrollHeight;
		this.#api.sendMessage(chatId, text, {
			localId,
			_resolvedTier: resolved,
			themeManager: this.#themeManager,
			i18n: this.#i18n,
		})
			.then(serverMsg => { if (serverMsg?.id) this.confirmMessage(localId, serverMsg); })
			.catch(e => {
				console.warn('[MessengerChatView] sendMessage', e);
				this.updateMessageStatus(localId, 'error');
			});
	}
	#insertNewMsgDivider() {
		const wrap = this.#utils.mk('div', 'mc-new-msg-divider');
		const pill = this.#utils.mk('span', 'mc-new-msg-divider-pill');
		pill.textContent = this.#i18n.t('newMessages') || 'Новые сообщения';
		wrap.appendChild(pill);
		this.el.messages.appendChild(wrap);
	}
	#updateAvatarCache(msg) {
		if (!msg.senderAvatar || !msg.senderId) return;
		if (this.#avatarCache.get(msg.senderId) === msg.senderAvatar) return;
		this.#avatarCache.set(msg.senderId, msg.senderAvatar);
		this.el.messages?.querySelectorAll(`[data-sender-id="${msg.senderId}"] .mc-avatar-img`)
			.forEach(img => { img.src = msg.senderAvatar; });
	}
	#buildHeader() {
		const header = this.#utils.mk('div', 'mc-header');
		const backBtn = this.#utils.mk('button', 'mc-back-btn');
		backBtn.innerHTML = this.#icons.back();
		backBtn.addEventListener('click', () => {
			if (MessengerUtils.isMobile() && messengerHistoryHasStackedOverlay()) {
				try { history.back(); return; } catch (_) {}
			}
			if (typeof this.#options.onBack === 'function') {
				this.#options.onBack();
			}
		});
		const avatar = this.#avatarBuilder.build(this.#chatMeta.id, this.#chatMeta.name, this.#chatMeta.avatar, 32);
		const nameEl = this.#utils.mk('div', 'mc-header-name');
		nameEl.textContent = this.#chatMeta.name;
		const subEl = this.#utils.mk('div', 'mc-header-sub');
		subEl.textContent = this.#i18n.t('typeLabels')[this.#chatMeta.type] || '';
		const activityBar = this.#msgRenderer.buildActivityBar();
		this.#activityTracker = new MessengerActivityTracker(activities => {
			this.#msgRenderer.updateActivityBar(activityBar, activities, this.#i18n);
		});
		const subRow = this.#utils.mk('div', 'mc-header-sub-row');
		subRow.append(subEl, activityBar);
		const nameWrap = this.#utils.mk('div', 'mc-header-name-wrap');
		nameWrap.append(nameEl, subRow);
		const info = this.#utils.mk('div', 'mc-header-info');
		info.append(backBtn, avatar, nameWrap);
		const menuWrap = this.#utils.mk('div', 'mc-menu-wrap');
		const dotsBtn = this.#utils.mk('button', 'mc-dots-btn');
		dotsBtn.innerHTML = this.#icons.dots();
		const dropdown = this.#utils.mk('div', 'mc-menu');
		dropdown.closeSubmenus = () => {};
		dotsBtn.addEventListener('click', e => { e.stopPropagation(); this.#toggleMenu(dropdown); });
		menuWrap.append(dotsBtn, dropdown);
		Object.assign(this.el, { menu: dropdown });
		header.append(info, menuWrap);
		return header;
	}
	#toggleMenu(dropdown) {
		this.#menuOpen = !this.#menuOpen;
		dropdown.classList.toggle('mc-menu--open', this.#menuOpen);
	}
	#closeMenus() {
		this.#menuOpen = false;
		this.el.menu?.classList.remove('mc-menu--open');
		this.el.menu?.closeSubmenus?.();
	}

	handleHistoryCleared() {
		this.#messages.clear();
		this.#renderedIds?.clear?.();
		if (this.el.msgArea) {
			this.el.msgArea.innerHTML = '';
			const topLoader = this.#utils.mk('div', 'mc-top-loader');
			topLoader.hidden = true;
			topLoader.appendChild(this.#utils.mk('div', 'mc-loader-spinner'));
			this.el.msgArea.appendChild(topLoader);
		}
		this.#msgService.resetChat(this.#chatMeta?.id);
		this.loadHistoryChunk?.();
	}

	destroy() {
		this.#scrollCleanup?.();
		this.#scrollCleanup = null;
		this.#stickyDateSep?.destroy();
		this.#stickyDateSep = null;
		this.#fetchAbortController?.abort();
		this.#fetchAbortController = null;
		this.#activityTracker?.destroy();
		this.#msgService?.destroy();
		if (this.#popstateHandler) {
			window.removeEventListener('popstate', this.#popstateHandler);
			this.#popstateHandler = null;
		}
		this.#viewportDestroy?.();
	}
	#el(key) { return this.el[key]; }
}

class MessengerActivityTracker {
	static DEFAULT_TIMEOUT = 10000;

	#onChange;
	#timeout;
	#activities = new Map();

	constructor(onChange, timeout = MessengerActivityTracker.DEFAULT_TIMEOUT) {
		this.#onChange = onChange;
		this.#timeout = timeout;
	}

	update(userId, userName, activityType, active) {
		const key = `${userId}:${activityType}`;
		if (!active) {
			this.#clear(key);
			return;
		}
		if (this.#activities.has(key)) clearTimeout(this.#activities.get(key).timer);
		const timer = setTimeout(() => this.#clear(key), this.#timeout);
		this.#activities.set(key, {
			userId,
			userName,
			activityType,
			timer
		});
		this.#notify();
	}

	#clear(key) {
		const entry = this.#activities.get(key);
		if (!entry) return;
		clearTimeout(entry.timer);
		this.#activities.delete(key);
		this.#notify();
	}

	#notify() {
		const list = [...this.#activities.values()].map(({
			userId,
			userName,
			activityType
		}) => ({
			userId,
			userName,
			activityType,
		}));
		this.#onChange(list);
	}

	destroy() {
		this.#activities.forEach(e => clearTimeout(e.timer));
		this.#activities.clear();
	}
}

class MessengerConnectionStateManager {
	static STATE_CONNECTING = 'connecting';
	static STATE_CONNECTED = 'connected';
	static STATE_OFFLINE = 'offline';

	#state = MessengerConnectionStateManager.STATE_CONNECTING;
	#error = '';
	#listeners = new Set();

	get state() { return this.#state; }
	get error() { return this.#error; }

	setState(state, error = '') {
		const nextError = state === MessengerConnectionStateManager.STATE_OFFLINE
			? (error || this.#error)
			: '';
		if (this.#state === state && this.#error === nextError) return;
		this.#state = state;
		this.#error = nextError;
		this.#notify();
	}

	subscribe(fn) {
		this.#listeners.add(fn);
		fn(this.#state, this.#error);
		return () => this.#listeners.delete(fn);
	}

	#notify() {
		this.#listeners.forEach(fn => {
			try { fn(this.#state, this.#error); } catch (e) { console.warn('[ConnectionState]', e); }
		});
	}
}

class MessengerPresenceManager {
	#statuses = new Map();
	#listeners = new Set();
	#activityBound = false;
	#lastReport = 0;
	static REPORT_THROTTLE_MS = 15000;

	get(userId) {
		return this.#statuses.get(userId) || 'offline';
	}

	update(userId, status) {
		if (!userId) return;
		const prev = this.#statuses.get(userId);
		if (prev === status) return;
		this.#statuses.set(userId, status);
		this.#notify();
	}

	subscribe(fn) {
		this.#listeners.add(fn);
		return () => this.#listeners.delete(fn);
	}

	bindActivityReporting(reportFn, rootEl = null) {
		if (this.#activityBound || typeof reportFn !== 'function') return;
		this.#activityBound = true;
		const report = () => {
			const now = Date.now();
			if (now - this.#lastReport < MessengerPresenceManager.REPORT_THROTTLE_MS) return;
			this.#lastReport = now;
			reportFn();
		};
		const events = [
			'mousemove', 'mousedown', 'keydown', 'keyup', 'input',
			'touchstart', 'scroll', 'pointerdown', 'pointermove', 'click', 'wheel', 'focusin',
		];
		const targets = new Set([document, window]);
		if (rootEl) targets.add(rootEl);
		targets.forEach(target => {
			events.forEach(ev => {
				target.addEventListener(ev, report, { passive: true, capture: true });
			});
		});
	}

	#notify() {
		this.#listeners.forEach(fn => {
			try { fn(this.#statuses); } catch (e) { console.warn('[Presence]', e); }
		});
	}
}

class MessengerMessageSounds {
	static #incomingUrl = null;
	static #outgoingUrl = null;
	static #incomingRev = 0;
	static #outgoingRev = 0;
	static #incomingAudio = null;
	static #outgoingAudio = null;
	static #loadPromise = null;

	static configure(data) {
		if (!data) return;
		const inUrl = data.incomingMessageSoundUrl || null;
		const outUrl = data.outgoingMessageSoundUrl || null;
		if (inUrl !== this.#incomingUrl) {
			this.#incomingUrl = inUrl;
			this.#incomingRev += 1;
			this.#incomingAudio = null;
		}
		if (outUrl !== this.#outgoingUrl) {
			this.#outgoingUrl = outUrl;
			this.#outgoingRev += 1;
			this.#outgoingAudio = null;
		}
	}

	static async ensureLoaded() {
		if (!this.#loadPromise) {
			this.#loadPromise = (async () => {
				try {
					const p = typeof globalThis !== 'undefined' && globalThis.__appAppearancePromise
						? globalThis.__appAppearancePromise
						: fetch('/api/app/appearance', { credentials: 'same-origin' })
							.then(r => (r.ok ? r.json() : null));
					const data = await p;
					this.configure(data);
				} catch (e) {
					console.warn('[MessengerMessageSounds] load', e);
				}
			})();
		}
		await this.#loadPromise;
	}

	static #soundUrl(base, rev) {
		if (!base) return null;
		const sep = base.includes('?') ? '&' : '?';
		return base + sep + 'v=' + rev;
	}

	static #play(kind) {
		const url = kind === 'incoming' ? this.#incomingUrl : this.#outgoingUrl;
		if (!url) return;
		const rev = kind === 'incoming' ? this.#incomingRev : this.#outgoingRev;
		let audio = kind === 'incoming' ? this.#incomingAudio : this.#outgoingAudio;
		const src = this.#soundUrl(url, rev);
		if (!audio || audio.dataset.soundSrc !== src) {
			audio = new Audio(src);
			audio.dataset.soundSrc = src;
			audio.preload = 'auto';
			if (kind === 'incoming') this.#incomingAudio = audio;
			else this.#outgoingAudio = audio;
		}
		try {
			audio.currentTime = 0;
			const p = audio.play();
			if (p && typeof p.catch === 'function') p.catch(() => {});
		} catch (_) { /* autoplay policy */ }
	}

	static playIncoming() {
		void this.ensureLoaded().then(() => this.#play('incoming'));
	}

	static playOutgoing() {
		void this.ensureLoaded().then(() => this.#play('outgoing'));
	}
}

class Messenger {
	static MODE_APP = 'app';
	static MODE_CHAT = 'chat';
	#mode;
	#options;
	#container;
	#i18n;
	#icons;
	#utils;
	#themeManager;
	#api;
	#cache;
	#msgService;
	#transport;
	#avatarBuilder;
	#msgRenderer;
	#panelFactory;
	#modal;
	#sidebar;
	#appView;
	#chatView;
	#menuBuilder;
	#settingsModal;
	#profileModal;
	#tokenWatcher;
	#presence;
	#readGate;
	/** @type {Set<string>} */
	#handledLoginChanges = new Set();
	#readyPromise;
	#renderedPromise;
	#chatsLoadedPromise;
	#chatsLoadedResolve;
	#renderedResolve;
	constructor(selector, mode, options = {}) {
		if (mode !== Messenger.MODE_APP && mode !== Messenger.MODE_CHAT)
			throw new Error(`Messenger: unknown mode "${mode}"`);
		this.#mode = mode;
		this.#options = options;
		this.#container = typeof selector === 'string'
			? document.querySelector(selector) : selector;
		if (!this.#container) throw new Error(`Messenger: container "${selector}" not found`);
		if (mode === Messenger.MODE_CHAT) {
			if (!options.chatId) throw new Error('Messenger (MODE_CHAT): chatId is required');
			if (!options.chatName) throw new Error('Messenger (MODE_CHAT): chatName is required');
		}
		const fileTransferTypes = Array.isArray(options.fileTransferTypes) ? options.fileTransferTypes : [];
		const themeKey = `mc-theme:${mode === Messenger.MODE_CHAT ? options.chatId : 'app'}`;
		const cacheInst = new MessengerCache();
		cacheInst.setCryptoGetter(() => window.supraCrypto || null);
		cacheInst.open().catch(e => console.warn('[Messenger] Cache open error:', e));
		const msgServiceInst = new MessengerMessageService(cacheInst);
		const i18nInst = new MessengerI18n(options.locale || 'ru');
		const iconsInst = new MessengerIcons();
		const utilsInst = new MessengerUtils(i18nInst);
		const themeManagerInst = new MessengerThemeManager(themeKey);
		const apiInst = new MessengerApiClient();
		const avatarBuilderInst = new MessengerAvatarBuilder(utilsInst);
		const presenceInst = new MessengerPresenceManager();
		const msgRendererInst = new MessengerMessageRenderer(
			utilsInst, iconsInst, avatarBuilderInst, i18nInst, cacheInst
		);
		const panelFactoryInst = new MessengerChatPanel(
			utilsInst, iconsInst, avatarBuilderInst, msgRendererInst,
			themeManagerInst, i18nInst, apiInst, 20, cacheInst, presenceInst
		);
		const modalInst = new MessengerNewChatModal(
			utilsInst, iconsInst, avatarBuilderInst, apiInst, i18nInst, themeManagerInst
		);
		const sidebarInst = new MessengerSidebar(utilsInst, iconsInst, avatarBuilderInst, i18nInst);
		sidebarInst.setThemeManager(themeManagerInst);
		const menuBuilderInst = new MessengerMenuBuilder(utilsInst, i18nInst, themeManagerInst);
		const settingsModalInst = new MessengerSettingsModal(
			utilsInst, iconsInst, i18nInst, themeManagerInst, menuBuilderInst,
			() => this.#onClearMessageCache(),
			() => this.#onClearAllCache(),
			apiInst,
			() => appViewInst.loadFolders(),
			() => appViewInst.openArchiveFolder(),
			() => appViewInst.promptCreateFolder(null)
		);
		const profileModalInst = new MessengerUserProfileModal(
			utilsInst, iconsInst, i18nInst, themeManagerInst, menuBuilderInst, avatarBuilderInst,
			() => this.#onClearMessageCache(),
			() => this.#onClearAllCache()
		);
		const groupProfileModalInst = new MessengerGroupProfileModal(
			utilsInst, iconsInst, i18nInst, themeManagerInst, menuBuilderInst, avatarBuilderInst, apiInst
		);
		const readGateInst = new MessengerChatReadGate();
		const appViewInst = new MessengerAppView(
			utilsInst, iconsInst, themeManagerInst, i18nInst,
			sidebarInst, panelFactoryInst, modalInst, apiInst, fileTransferTypes,
			settingsModalInst, profileModalInst, groupProfileModalInst, avatarBuilderInst,
			readGateInst
		);
		appViewInst.setMessageService(msgServiceInst);
		panelFactoryInst.setReadEngagement(
			readGateInst,
			(chatId) => appViewInst.isChatVisibleForRead(chatId)
		);
		const chatViewInst = new MessengerChatView(
			utilsInst, iconsInst, avatarBuilderInst, msgRendererInst,
			themeManagerInst, apiInst, i18nInst,
			{ ...options, fileTransferTypes },
			20, cacheInst,
			readGateInst
		);
		const connectionStateInst = new MessengerConnectionStateManager();
		const transportInst = new MessengerTransport(
			body => this.#onTransportMessage(body),
			options.wsUrl || null,
			connectionStateInst
		);
		transportInst.setOnConnectionRestored(() => this.#syncAfterReconnect());
		this.#i18n = i18nInst;
		this.#icons = iconsInst;
		this.#utils = utilsInst;
		this.#themeManager = themeManagerInst;
		this.#api = apiInst;
		this.#cache = cacheInst;
		this.#msgService = msgServiceInst;
		this.#transport = transportInst;
		this.#avatarBuilder = avatarBuilderInst;
		this.#msgRenderer = msgRendererInst;
		this.#panelFactory = panelFactoryInst;
		this.#modal = modalInst;
		this.#sidebar = sidebarInst;
		this.#menuBuilder = menuBuilderInst;
		this.#settingsModal = settingsModalInst;
		this.#profileModal = profileModalInst;
		this.#appView = appViewInst;
		this.#chatView = chatViewInst;
		this.#presence = presenceInst;
		this.#readGate = readGateInst;
		if (mode === Messenger.MODE_APP) {
			appViewInst.setPresenceManager(presenceInst);
			appViewInst.setConnectionStateManager(connectionStateInst);
			appViewInst.setOnNetworkReconnect(() => transportInst.resumeConnection('user'));
			appViewInst.setOnClearChatCache(chatId => this.clearChatCache(chatId));
			panelFactoryInst.setPresenceManager(presenceInst);
			panelFactoryInst.setConnectionStateManager(connectionStateInst);
		}
		presenceInst.bindActivityReporting(() => transportInst.reportActivity(), this.#container);
		themeManagerInst.apply(themeManagerInst.current);
		this.#tokenWatcher = new MessengerTokenWatcher(
			(newToken, oldToken) => this.#onTokenChanged(newToken, oldToken),
			options.tokenWatchInterval ?? 5000
		);
		this.#tokenWatcher.start();
		this.#renderedPromise = new Promise((resolve) => {
			this.#renderedResolve = resolve;
		});
		this.#chatsLoadedPromise = new Promise((resolve) => {
			this.#chatsLoadedResolve = resolve;
		});
		this.#readyPromise = (mode === Messenger.MODE_APP ? this.#initApp() : this.#initChat())
			.catch((e) => {
				console.error('[Messenger] init error:', e);
				throw e;
			});
	}
	whenReady() {
		return this.#readyPromise || Promise.resolve();
	}
	whenRendered() {
		return this.#renderedPromise || Promise.resolve();
	}
	whenChatsLoaded() {
		return this.#chatsLoadedPromise || Promise.resolve();
	}
	#markChatsLoaded() {
		if (this.#chatsLoadedResolve) {
			this.#chatsLoadedResolve();
			this.#chatsLoadedResolve = null;
		}
	}
	#markRendered() {
		if (this.#renderedResolve) {
			this.#renderedResolve();
			this.#renderedResolve = null;
		}
	}
	#mapBootUser(raw) {
		if (!raw?.id) return null;
		return {
			id: raw.id,
			login: raw.login,
			name: raw.name,
			avatar: raw.avatar || null,
			colorSeed: raw.colorSeed || 'default',
			userType: raw.userType || 'User',
			statusText: raw.statusText || '',
			encryptionConfigured: !!raw.encryptionConfigured,
		};
	}

	#resolveBootUser() {
		const raw = typeof globalThis !== 'undefined' ? globalThis.__smBootUser : null;
		return raw ? this.#mapBootUser(raw) : null;
	}

	async #loadBootChats(bootMark) {
		try {
			const chats = await this.#api.getChats();
			if (bootMark) bootMark('init-chats-loaded', { count: chats?.length ?? 0 });
			this.#appView.setChats(chats);
			if (bootMark) bootMark('init-data-ready');
		} catch (e) {
			console.warn('[Messenger] getChats', e);
			this.#appView.setChatsBootLoading(false);
		} finally {
			this.#markChatsLoaded();
		}
	}

	async #initApp() {
		const bootMark = typeof globalThis !== 'undefined' ? globalThis.__bootMark : null;
		if (bootMark) bootMark('init-app-start');
		this.#appView.render(this.#container);
		if (bootMark) bootMark('init-app-rendered');
		const bootUser = this.#resolveBootUser();
		let user = bootUser;
		try {
			const apiUser = await this.#api.getCurrentUser();
			if (apiUser?.id) user = { ...bootUser, ...apiUser };
		} catch (e) {
			console.warn('[Messenger] getCurrentUser', e);
		}
		if (!user?.id) user = await this.#api.getCurrentUser();
		this.#appView.setCurrentUser(user);
		if (user?.id) this.#api.setCurrentUserId(user.id);
		this.#appView.setChatsBootLoading(true);
		void this.#appView.loadFolders().catch(() => {});
		await this.#appView.restoreNavState();
		this.#markRendered();
		if (bootMark) bootMark('init-shell-ready');
		void this.#loadBootChats(bootMark);
		this.#msgService.reconcileOnStartup(
			this.#api,
			(result) => this.#onReconcileResult(result),
			this.#options.reconcileAgeMs ?? 10000
		).catch(e => console.warn('[Messenger] reconcileOnStartup error:', e));
		const atMatch = window.location.pathname.match(/^\/@([^/?#]+)$/i);
		if (atMatch) {
			const slug = decodeURIComponent(atMatch[1]);
			if (isGroupChatId(slug)) {
				await this.#appView.openGroupByChatId(slug).catch(() => {});
			} else {
				await this.#appView.openProfileByLogin(slug).catch(() => {});
			}
			normalizeAppUrl();
		}
	}
	async #initChat() {
		const [user] = await Promise.all([
			this.#api.getCurrentUser(),
			this.#api.getChats().catch(() => []),
		]);
		this.#chatView.setCurrentUser(user);
		const { chatId, chatName, chatType, chatAvatar } = this.#options;
		this.#chatView.renderPlaceholder(this.#container, chatName);
		this.#markRendered();
		try {
			const result = await this.#api.getOrCreateChatById(chatId, chatName);
			const chatMeta = {
				id: result.chatId,
				name: result.chatName,
				type: chatType || 'public_group',
				avatar: chatAvatar || null,
			};
			this.#container.innerHTML = '';
			this.#chatView.render(this.#container, chatMeta);
			this.#chatView.loadHistoryChunk();
			this.#msgService.reconcileOnStartup(
				this.#api,
				(result) => this.#onReconcileResult(result),
				this.#options.reconcileAgeMs ?? 10000
			).catch(e => console.warn('[Messenger] reconcileOnStartup error:', e));
		} catch (e) {
			console.error('[Messenger] initChat error:', e);
			this.#container.innerHTML = '';
			this.#chatView.renderError(this.#container, chatName, e.message);
		} finally {
			this.#markChatsLoaded();
		}
	}
	#onReconcileResult(result) {
		const status = result.outcome === 'confirmed' ? 'sent' : 'error';
		if (this.#mode === Messenger.MODE_APP) {
			this.#appView.updateMessageStatus(result.localId, status);
		} else if (this.#mode === Messenger.MODE_CHAT) {
			if (result.chatId === this.#options.chatId) {
				this.#chatView.updateMessageStatus(result.localId, status);
			}
		}
	}
	#onTokenChanged(newToken, oldToken) {
		console.info('[Messenger] BPMCSRF token changed', { oldToken, newToken });
		this.#msgService.resetAll().then(() => {
			if (this.#mode === Messenger.MODE_APP) {
				this.#appView.reloadAllChats();
			} else if (this.#mode === Messenger.MODE_CHAT) {
				this.#chatView.destroy?.();
				this.#initChat();
			}
		});
	}
	async #syncAfterReconnect() {
		try {
			if (this.#mode === Messenger.MODE_APP) {
				await this.#appView.syncAfterReconnect(this.#msgService, this.#api);
			} else if (this.#chatView.chatMeta?.id) {
				const chatId = this.#chatView.chatMeta.id;
				const { messages, reconcile } = await this.#msgService.syncChatAfterOffline(chatId, this.#api);
				for (const msg of messages) {
					if (this.#chatView.chatMeta?.id !== chatId) break;
					await this.#chatView.receiveMessage(msg);
				}
				if (reconcile?.historyCleared) {
					this.#chatView.handleHistoryCleared?.();
				} else {
					for (const id of reconcile?.removedIds || []) {
						this.#chatView.deleteMessage(id, id);
					}
				}
			}
		} catch (e) {
			console.warn('[Messenger] syncAfterReconnect error:', e);
		}
	}
	async #onClearMessageCache() {
		await this.#msgService.resetAll();
		if (this.#mode === Messenger.MODE_APP) {
			await this.#appView.reloadAllChats();
		} else if (this.#mode === Messenger.MODE_CHAT) {
			this.#chatView.destroy?.();
			await this.#initChat();
		}
	}
	async #onClearAllCache() {
		await this.#cache.clearAll();
		if (typeof AppScriptCache !== 'undefined') AppScriptCache.clear();
		if (this.#mode === Messenger.MODE_APP) {
			await this.#appView.reloadAllChats();
		} else if (this.#mode === Messenger.MODE_CHAT) {
			this.#chatView.destroy?.();
			await this.#initChat();
		}
	}
	#markReadIfEngaged(chatId) {
		if (!chatId) return;
		if (this.#mode === Messenger.MODE_APP) {
			this.#appView.markReadIfEngaged(chatId);
		} else if (this.#chatView.chatMeta?.id === chatId) {
			this.#chatView.markReadIfEngaged();
		}
	}

	/**
	 * Локальное уведомление, когда приложение открыто, но свёрнуто (вкладка скрыта),
	 * а соединение SignalR ещё живо — в этом случае сервер не шлёт Web Push (считает
	 * пользователя онлайн), поэтому показываем уведомление сами через service worker.
	 * Текст намеренно общий — как и в серверном пуше (E2E-приватность).
	 */
	#showBackgroundNotification(chatId, senderName) {
		try {
			if (typeof document === 'undefined' || document.visibilityState !== 'hidden') return;
			if (!window.SupraEnv || !window.SupraEnv.serviceWorkerEnabled) return;
			if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
			if (!navigator.serviceWorker) return;
			// Учитываем глобальное отключение и заглушение конкретного чата.
			if (window.SupraPush && typeof window.SupraPush.shouldNotify === 'function' &&
				!window.SupraPush.shouldNotify(chatId)) return;

			let title = 'Новое сообщение';
			let bodyText = 'Откройте приложение, чтобы прочитать.';
			const sender = (senderName || '').trim();
			const info = this.#getChatNotificationInfo(chatId);
			if (info && info.isGroup) {
				title = (info.name || '').trim() || sender || title;
				if (sender) bodyText = sender;
			} else if (sender) {
				title = sender;
			}

			navigator.serviceWorker.ready.then((reg) => {
				if (!reg || !reg.showNotification) return;
				reg.showNotification(title, {
					body: bodyText,
					icon: '/icons/icon-192.png',
					badge: '/icons/badge-72.png',
					tag: chatId ? ('sm-chat-' + chatId) : 'sm-new-message',
					renotify: true,
					data: { url: '/', chatId: chatId || null },
				});
			}).catch(() => { /* ignore */ });
		} catch (_) { /* ignore */ }
	}

	#getChatNotificationInfo(chatId) {
		try {
			if (!chatId) return null;
			if (this.#mode === Messenger.MODE_APP &&
				typeof this.#appView.getChatNotificationInfo === 'function') {
				return this.#appView.getChatNotificationInfo(chatId);
			}
			const meta = this.#chatView?.chatMeta;
			if (meta && meta.id === chatId) {
				const isGroup = meta.type === 'group' || meta.type === 'public_group';
				return { isGroup, name: meta.name || '' };
			}
		} catch (_) { /* ignore */ }
		return null;
	}

	#onTransportMessage(body) {
		switch (body.type) {
			case 'SupraNewChatMessage': {
				const meId = this.#mode === Messenger.MODE_APP
					? this.#appView.getCurrentUser()?.id
					: this.#chatView.getCurrentUser()?.id;
				const rawMsg = {
					id: body.messageId,
					senderId: body.senderId,
					senderName: body.senderName,
					senderAvatar: body.senderAvatar || null,
					text: body.text,
					timestamp: new Date(body.timestamp),
					status: body.status || 'sent',
					isOwn: !!(meId && body.senderId === meId),
					replyToMessageId: body.replyToMessageId || null,
					replyToSenderName: body.replyToSenderName || null,
					replyToTextPreview: body.replyToTextPreview || null,
					forwardedFromSenderName: body.forwardedFromSenderName || null,
					editedOn: body.editedOn ? new Date(body.editedOn) : null,
					deletedForEveryone: !!body.deletedForEveryone,
					encryptionTier: body.encryptionTier || 'basic',
				};
				const listPreviewSource = {
					text: body.text,
					_encText: (typeof SupraCrypto !== 'undefined' && SupraCrypto.isEncrypted(body.text))
						? body.text : null,
					deletedForEveryone: !!body.deletedForEveryone,
					encryptionTier: body.encryptionTier || 'basic',
				};
				this.#api.decryptRealtimeMessage(body.chatId, rawMsg).then(async msg => {
					if (!msg.isOwn) {
						MessengerMessageSounds.playIncoming();
						this.#showBackgroundNotification(body.chatId, msg.senderName || body.senderName);
					}
					if (this.#mode === Messenger.MODE_APP) {
						try {
							await this.#msgService.ingestOne(body.chatId, msg);
						} catch (e) {
							console.warn('[Messenger] cache realtime message', e);
						}
						if (msg.isOwn) {
							await this.#appView.receiveOwnMessage(body.chatId, msg, listPreviewSource);
						} else {
							this.#appView.receiveMessage(body.chatId, msg, listPreviewSource);
						}
						if (this.#appView.isChatVisibleForRead(body.chatId)) {
							this.#markReadIfEngaged(body.chatId);
						}
					} else if (this.#chatView.chatMeta?.id === body.chatId) {
						try {
							await this.#msgService.ingestOne(body.chatId, msg);
						} catch (e) {
							console.warn('[Messenger] cache realtime message', e);
						}
						if (msg.isOwn) {
							await this.#chatView.receiveOwnMessage(msg);
						} else {
							this.#chatView.receiveMessage(msg);
						}
						this.#markReadIfEngaged(body.chatId);
					}
				}).catch(e => console.warn('[Messenger] decrypt realtime', e));
				break;
			}
			case 'SupraChatRead': {
				const { chatId } = body;
				if (!chatId) break;
				if (this.#mode === Messenger.MODE_APP) {
					this.#appView.clearUnread(chatId);
				}
				break;
			}
			case 'SupraMessageStatusUpdate': {
				const { messageId, status, chatId } = body;
				if (this.#mode === Messenger.MODE_APP) {
					this.#appView.updateMessageStatus(messageId, status);
				} else {
					this.#chatView.updateMessageStatus(messageId, status);
				}
				if (chatId) {
					this.#msgService.syncMessageStatus(chatId, messageId, status)
						.catch(e => console.warn('[Messenger] syncMessageStatus error:', e));
				} else if (this.#mode === Messenger.MODE_APP) {
					this.#appView.syncMessageStatusInCache(messageId, status)
						.catch(e => console.warn('[Messenger] syncMessageStatusInCache error:', e));
				} else if (this.#chatView.chatMeta?.id) {
					this.#msgService.syncMessageStatus(this.#chatView.chatMeta.id, messageId, status)
						.catch(e => console.warn('[Messenger] syncMessageStatus (chat mode) error:', e));
				}
				break;
			}
			case 'SupraNewChat':
				if (this.#mode === Messenger.MODE_APP)
					this.#appView.addChat({
						id: body.chatId,
						name: body.chatName,
						type: body.chatType || 'group',
						avatar: body.chatAvatar || null,
						lastMessage: '',
						lastMessageTime: null,
						unreadCount: 0,
					});
				break;
			case 'SupraUserActivity':
				if (this.#mode === Messenger.MODE_APP)
					this.#appView.receiveActivity(body.chatId, body.userId, body.userName, body.activityType, body.active);
				else if (this.#chatView.chatMeta?.id === body.chatId)
					this.#chatView.receiveActivity(body.userId, body.userName, body.activityType, body.active);
				break;
			case 'SupraMessageUpdated': {
				const { chatId, messageId } = body;
				if (!chatId || !messageId) break;
				if (this.#mode === Messenger.MODE_APP) {
					this.#appView.applyMessageUpdated(chatId, body);
				} else if (this.#chatView.chatMeta?.id === chatId) {
					this.#chatView.applyMessageUpdated(body);
				}
				break;
			}
			case 'SupraDeleteMessage': {
				const { chatId, messageId, deleteScope } = body;
				if (deleteScope === 'everyone') {
					this.#msgService.deleteMessage(chatId, messageId)
						.then(({ storedId, originalId }) => {
							const idForDom = storedId ?? originalId ?? messageId;
							if (this.#mode === Messenger.MODE_APP) {
								this.#appView.deleteMessage(chatId, idForDom, originalId ?? messageId);
							} else if (this.#mode === Messenger.MODE_CHAT) {
								if (this.#chatView.chatMeta?.id === chatId) {
									this.#chatView.deleteMessage(idForDom, originalId ?? messageId);
								}
							}
						})
						.catch(e => console.warn('[Messenger] SupraDeleteMessage handling error:', e));
					break;
				}
				this.#msgService.deleteMessage(chatId, messageId, deleteScope)
					.then(({ storedId, originalId }) => {
						const idForDom = storedId ?? originalId;
						if (this.#mode === Messenger.MODE_APP) {
							this.#appView.deleteMessage(chatId, idForDom, originalId);
						} else if (this.#mode === Messenger.MODE_CHAT) {
							if (this.#chatView.chatMeta?.id === chatId) {
								this.#chatView.deleteMessage(idForDom, originalId);
							}
						}
					})
					.catch(e => console.warn('[Messenger] SupraDeleteMessage handling error:', e));
				break;
			}
			case 'SupraChatHistoryCleared': {
				const { chatId } = body;
				if (!chatId) break;
				this.clearChatCache(chatId).catch(e =>
					console.warn('[Messenger] clearChatCache on history cleared', e));
				if (this.#mode === Messenger.MODE_APP) {
					this.#appView.handleHistoryCleared(chatId);
				} else if (this.#chatView.chatMeta?.id === chatId) {
					this.#chatView.handleHistoryCleared?.();
				}
				break;
			}
			case 'SupraPresenceUpdate': {
				const { userId, status } = body;
				if (userId && status) {
					this.#presence?.update(userId, status);
					if (status === 'offline' && this.#mode === Messenger.MODE_APP) {
						this.#appView.touchContactLastSeen(userId);
					}
				}
				break;
			}
			case 'SupraGroupUpdated': {
				const { chatId, chatName, chatAvatar, requiresCustomGroupPassword } = body;
				if (!chatId) break;
				if (this.#mode === Messenger.MODE_APP) {
					this.#appView.updateChatMeta(chatId, {
						name: chatName,
						avatar: chatAvatar ?? null,
						requiresCustomGroupPassword,
					});
				}
				break;
			}
			case 'SupraChatRemoved': {
				const { chatId } = body;
				if (!chatId) break;
				if (this.#mode === Messenger.MODE_APP) {
					this.#appView.removeChat(chatId, { showMobileList: true, clearCache: true })
						.catch(e => console.warn('[Messenger] SupraChatRemoved', e));
				} else if (this.#chatView.chatMeta?.id === chatId) {
					window.location.href = '/';
				}
				break;
			}
			case 'SupraProfileUpdated': {
				const { userId, statusText, displayName, aboutText, avatar } = body;
				if (!userId || this.#mode !== Messenger.MODE_APP) break;
				const me = this.#appView.getCurrentUser();
				if (me?.id === userId) {
					this.#appView.setCurrentUser({
						...me,
						statusText: statusText != null ? String(statusText).trim() : '',
						name: displayName || me.name,
						avatar: avatar !== undefined ? avatar : me.avatar,
					});
				} else {
					this.#appView.updateContactProfile(userId, {
						statusText: statusText != null ? String(statusText).trim() : '',
						displayName: displayName || undefined,
						aboutText: aboutText != null ? String(aboutText).trim() : undefined,
						avatar: avatar !== undefined ? avatar : undefined,
					});
				}
				break;
			}
			case 'SupraLoginChanged': {
				const { userId, oldLogin, newLogin, displayName } = body;
				if (!userId || !newLogin) break;
				const dedupeKey = `${userId}|${newLogin}`;
				if (this.#handledLoginChanges.has(dedupeKey)) break;
				this.#handledLoginChanges.add(dedupeKey);
				if (this.#mode === Messenger.MODE_APP) {
					this.#appView.handleLoginChanged({ userId, oldLogin, newLogin, displayName });
				}
				break;
			}
		}
	}
	async clearCache() {
		await this.#cache.clearAll();
		this.#msgService.destroy();
	}
	async clearChatCache(chatId) {
		await this.#cache.clearChat(chatId);
		this.#msgService.resetChat(chatId);
	}
	setCrypto(crypto) {
		this.#api.setCrypto(crypto);
		this.#cache.setCryptoGetter(() => crypto);
		if (this.#mode === Messenger.MODE_APP && this.#appView) {
			this.#appView.refreshLastMessagePreviews()
				.catch(e => console.warn('[Messenger] refreshLastMessagePreviews', e));
		}
	}
	destroy() {
		this.#tokenWatcher.stop();
		this.#transport.destroy();
		this.#chatView?.destroy?.();
		this.#msgService?.destroy?.();
		this.#cache?.destroy?.();
	}
}

if (typeof window !== 'undefined') {
	window.Messenger = Messenger;
	window.MessengerDialog = MessengerDialog;
	window.MessengerMessageSounds = MessengerMessageSounds;
	window.MessengerThemeManager = MessengerThemeManager;
	// Глобальный обработчик «назад»: закрывает верхний оверлей/диалог раньше всех
	// остальных слушателей (чтобы не было выхода в список чатов).
	window.addEventListener('popstate', () => { messengerHandleOverlayPopstate(); });
	document.addEventListener('contextmenu', e => {
		if (e.target.closest('.mc-msg-text, .mapp-selectable-text, input, textarea, select')) return;
		e.preventDefault();
	});
}
})(typeof window !== 'undefined' ? window : globalThis);
