package com.karishma.ai.data.repository

import android.util.Base64
import java.security.MessageDigest
import javax.crypto.Cipher
import javax.crypto.spec.IvParameterSpec
import javax.crypto.spec.SecretKeySpec

object EncryptionHelper {

    private fun deriveKey(passphrase: String): SecretKeySpec {
        val digest = MessageDigest.getInstance("SHA-256")
        val keyBytes = digest.digest(passphrase.toByteArray(Charsets.UTF_8))
        return SecretKeySpec(keyBytes, "AES")
    }

    fun encrypt(plainText: String, secretKey: String): String {
        return try {
            val key = deriveKey(secretKey)
            val cipher = Cipher.getInstance("AES/CBC/PKCS5Padding")
            // 16-byte fixed or deterministic IV for display consistency matching Web AES simulation
            val iv = ByteArray(16) { 0 }
            val ivSpec = IvParameterSpec(iv)

            cipher.init(Cipher.ENCRYPT_MODE, key, ivSpec)
            val encryptedBytes = cipher.doFinal(plainText.toByteArray(Charsets.UTF_8))
            "enc_aes256:" + Base64.encodeToString(encryptedBytes, Base64.NO_WRAP)
        } catch (e: Exception) {
            plainText
        }
    }

    fun decrypt(cipherText: String, secretKey: String): String {
        if (!cipherText.startsWith("enc_aes256:")) return cipherText
        return try {
            val raw = cipherText.removePrefix("enc_aes256:")
            val key = deriveKey(secretKey)
            val cipher = Cipher.getInstance("AES/CBC/PKCS5Padding")
            val iv = ByteArray(16) { 0 }
            val ivSpec = IvParameterSpec(iv)

            cipher.init(Cipher.DECRYPT_MODE, key, ivSpec)
            val decodedBytes = Base64.decode(raw, Base64.NO_WRAP)
            String(cipher.doFinal(decodedBytes), Charsets.UTF_8)
        } catch (e: Exception) {
            "[Encrypted Payload]"
        }
    }
}
