import React from 'react';
import {View, Text, StyleSheet, SafeAreaView, FlatList, TouchableOpacity, Image} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import avatar from '../../../assets/img/Avatar.png';

type RootStackParamList = {
    ChatMessage: {
        name: string;
        avatar: any;
        email: string;
    };
    // Add other screens if needed
};

type ReferralType = {
    email: string;
    name?: string;
    profilePic?: string;
    isMining?: boolean;
};

type RouteParams = {
    referrals: ReferralType[];
    title: string;
    subtitle: string;
};

const ReferralChatListScreen = () => {
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const route = useRoute();
    const { referrals, title, subtitle } = route.params as RouteParams;

    const handleSelectReferral = (referral: ReferralType) => {
        navigation.navigate('ChatMessage', {
            name: referral.name || referral.email.split('@')[0],
            avatar: referral.profilePic ? { uri: referral.profilePic } : avatar,
            email: referral.email
        });
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>{title}</Text>
                <Text style={styles.subtitle}>{subtitle}</Text>
            </View>

            {referrals.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>No referral members found</Text>
                </View>
            ) : (
                <FlatList
                    data={referrals}
                    keyExtractor={(item) => item.email}
                    renderItem={({ item }) => (
                        <TouchableOpacity
                            style={styles.referralItem}
                            onPress={() => handleSelectReferral(item)}
                        >
                            <Image
                                source={item.profilePic ? { uri: item.profilePic } : avatar}
                                style={styles.avatar}
                            />
                            <View style={styles.infoContainer}>
                                <Text style={styles.name}>
                                    {item.name || item.email.split('@')[0]}
                                </Text>
                                <Text style={styles.email}>{item.email}</Text>
                            </View>
                            <Text style={[
                                styles.status,
                                item.isMining ? styles.active : styles.inactive
                            ]}>
                                {item.isMining ? 'Active' : 'Inactive'}
                            </Text>
                        </TouchableOpacity>
                    )}
                />
            )}
        </SafeAreaView>
    );
};

// ... keep your existing styles ...
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    header: {
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#252525',
    },
    title: {
        color: '#fff',
        fontSize: 22,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    subtitle: {
        color: '#d5d5d5',
        fontSize: 14,
    },
    referralItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#252525',
    },
    avatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        marginRight: 12,
    },
    infoContainer: {
        flex: 1,
    },
    name: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '500',
        marginBottom: 4,
    },
    email: {
        color: '#888',
        fontSize: 14,
    },
    status: {
        fontSize: 14,
        fontWeight: '500',
    },
    active: {
        color: '#FF8728',
    },
    inactive: {
        color: '#666',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyText: {
        color: '#888',
        fontSize: 16,
    },
});

export default ReferralChatListScreen;